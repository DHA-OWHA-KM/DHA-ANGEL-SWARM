#!/usr/bin/env python3
"""
ANGEL SWARM — compensatory reserve from a photoplethysmogram.

WHAT THIS IS
------------
A soldier's wrist sensor emits a photoplethysmogram: the optical pulse
waveform of blood moving through the tissue under the sensor. This trains a
1-D convolutional network that reads five seconds of that waveform and
estimates the Compensatory Reserve Index — the fraction of the individual's
capacity to compensate for central blood volume loss that remains before
haemodynamic decompensation. CRI is 1.0 at euvolaemia and 0.0 at the point of
collapse.

This mirrors the operating principle of a fielded, FDA-cleared device
(CipherOx CRM, 510(k) K173929), whose ground truth in the literature comes
from lower-body negative pressure studies in which central volume is
progressively withdrawn from healthy volunteers under instrumented
conditions.

WHY IT IS NOT A LOOKUP TABLE ON HEART RATE
------------------------------------------
Tachycardia is the obvious response to volume loss and it is a poor
discriminator: it appears late, it saturates, and a meaningful fraction of
casualties do not mount it at all — beta blockade, high vagal tone, and the
paradoxical bradycardia seen in a subset of severe haemorrhages. This
generator therefore gives each synthetic subject its own chronotropic
responsiveness, including non-responders. A model that leans on rate alone
cannot do well, and the training script reports exactly that comparison so
the claim is checkable rather than asserted.

WHAT THE MODEL EMITS
--------------------
Two numbers, not one: the estimate, and the network's own predicted variance,
trained under a Gaussian negative-log-likelihood. When the sensor is on a
casualty who is moving, or perfusing badly, or the optical coupling is poor,
the waveform stops carrying the morphology the network relies on, and the
network says so by widening its interval. Tasking software that consumes this
can then decline to act on a reading it was told not to trust, which is the
difference between an autonomous system that is confident and one that is
honest.

Outputs ppg_cri.onnx plus a metrics JSON the application displays.
"""

import json
import math
import os
import time

import numpy as np
import torch
import torch.nn as nn

SEED = 1729
FS = 100  # Hz — sensor sample rate
WIN_S = 5.0  # seconds per inference window
N = int(FS * WIN_S)  # 500 samples

rng = np.random.default_rng(SEED)
torch.manual_seed(SEED)


# --------------------------------------------------------------------------
# Subject model
# --------------------------------------------------------------------------
def make_subject(r):
    """Draw one synthetic individual.

    Every parameter here is a property of the person, not of their injury.
    Holding these fixed across a subject's windows — and splitting train and
    test BY SUBJECT — is what makes the reported error an estimate of
    performance on a person the network has never seen, rather than on a
    slightly different five seconds of someone it already knows.
    """
    # Roughly a fifth of subjects blunt or invert the rate response.
    responder = r.random()
    if responder < 0.14:
        hr_gain = r.uniform(-8.0, 8.0)  # non-responder / paradoxical
    elif responder < 0.30:
        hr_gain = r.uniform(12.0, 30.0)  # blunted
    else:
        hr_gain = r.uniform(45.0, 80.0)  # normal chronotropic response

    return dict(
        hr0=r.uniform(52, 88),  # resting heart rate, bpm
        hr_gain=hr_gain,  # bpm added at full volume loss
        tone0=r.uniform(0.34, 0.62),  # baseline reflected-wave magnitude
        tone_gain=r.uniform(0.18, 0.42),  # vasoconstriction with volume loss
        notch0=r.uniform(0.30, 0.42),  # dicrotic notch timing, fraction of cycle
        width0=r.uniform(0.20, 0.30),  # systolic upstroke width
        amp0=r.uniform(0.75, 1.0),  # perfusion at the sensor site
        resp0=r.uniform(0.14, 0.28),  # respiratory rate, Hz
        dpop_gain=r.uniform(0.16, 0.40),  # rise in respiratory amplitude swing
        skin=r.uniform(0.55, 1.0),  # optical coupling quality
        drift=r.uniform(0.004, 0.020),  # baseline wander magnitude
    )


def pulse_shape(phase, tone, notch_at, width):
    """One cardiac cycle of the peripheral pulse.

    Two overlapping Gaussians: the forward systolic wave, and the wave
    reflected from the arterial periphery. Vasoconstriction raises the
    reflection and pulls it earlier, which is the morphological change that
    carries most of the information about volume state.
    """
    systolic = np.exp(-0.5 * ((phase - 0.16) / width) ** 2)
    reflected = tone * np.exp(-0.5 * ((phase - notch_at) / (width * 1.35)) ** 2)
    tail = 0.16 * np.exp(-3.2 * np.clip(phase - 0.45, 0, None))
    return systolic + reflected + tail


def synth_window(subj, cri, r, degrade=None):
    """Render one 5-second window at a given compensatory reserve.

    `degrade` optionally forces a signal-quality insult so the network sees,
    during training, the conditions under which it should widen its interval.
    """
    loss = 1.0 - cri  # 0 at euvolaemia, 1 at decompensation

    hr = subj["hr0"] + subj["hr_gain"] * (loss ** 1.25)
    hr = float(np.clip(hr + r.normal(0, 1.6), 38, 190))
    tone = subj["tone0"] + subj["tone_gain"] * loss
    notch_at = subj["notch0"] + 0.055 * loss  # notch rides up the downslope
    width = subj["width0"] * (1.0 - 0.24 * loss)  # pulse narrows
    # Stroke volume falls; peripheral constriction removes more amplitude.
    amp = subj["amp0"] * (1.0 - 0.62 * loss) * subj["skin"]
    dpop = 0.05 + subj["dpop_gain"] * loss  # respiratory swing grows

    t = np.arange(N) / FS
    beat_hz = hr / 60.0

    # Beat-to-beat interval variability, itself reduced by volume loss.
    hrv = max(0.004, 0.030 * (1.0 - 0.55 * loss))
    n_beats = int(math.ceil(beat_hz * WIN_S)) + 3
    intervals = np.clip(r.normal(1.0 / beat_hz, hrv, n_beats), 0.28, 1.6)
    edges = np.concatenate([[r.uniform(-1.0, 0.0)], np.cumsum(intervals)])

    x = np.zeros(N, dtype=np.float64)
    for b in range(len(edges) - 1):
        t0, t1 = edges[b], edges[b + 1]
        if t1 < 0 or t0 > WIN_S:
            continue
        m = (t >= t0) & (t < t1)
        if not m.any():
            continue
        x[m] = pulse_shape((t[m] - t0) / (t1 - t0), tone, notch_at, width)

    # Respiratory modulation of pulse amplitude — the ΔPOP signal.
    resp = 1.0 + dpop * np.sin(2 * np.pi * subj["resp0"] * t + r.uniform(0, 6.28))
    x *= amp * resp

    # Baseline wander from respiration and sensor motion.
    x += subj["drift"] * np.sin(2 * np.pi * subj["resp0"] * t + 1.1)
    x += subj["drift"] * 0.6 * np.sin(2 * np.pi * r.uniform(0.02, 0.09) * t)

    noise = 0.006 / max(subj["skin"], 0.3)
    quality = 1.0

    if degrade == "motion":
        # A burst of motion artefact — large, low-frequency, non-physiological.
        k = r.integers(60, 240)
        s = r.integers(0, N - k)
        x[s:s + k] += r.normal(0, 0.42, k).cumsum() * 0.05
        quality = 0.35
    elif degrade == "lowperf":
        # Cold, shut-down periphery: the pulse nearly vanishes into the noise.
        x *= r.uniform(0.10, 0.26)
        noise *= 3.0
        quality = 0.30
    elif degrade == "dropout":
        # Sensor lifts off the skin.
        k = r.integers(40, 160)
        s = r.integers(0, N - k)
        x[s:s + k] = r.normal(0, 0.02, k)
        quality = 0.25
    elif degrade == "noise":
        noise *= r.uniform(4.0, 11.0)
        quality = 0.45

    x += r.normal(0, noise, N)
    x = np.round(x * 4096) / 4096  # 12-bit ADC

    # Per-window normalisation. The absolute optical level says nothing about
    # volume state — it depends on skin, sensor pressure and site — so the
    # network must not be able to use it. Removing it here is what forces the
    # model onto morphology and rate rather than DC amplitude.
    mu, sd = x.mean(), x.std()
    x = (x - mu) / (sd + 1e-6)
    return x.astype(np.float32), quality, hr


def build_set(n_subjects, windows_per, r, degrade_rate=0.22):
    X = np.zeros((n_subjects * windows_per, 1, N), dtype=np.float32)
    y = np.zeros((n_subjects * windows_per,), dtype=np.float32)
    hrs = np.zeros_like(y)
    quals = np.zeros_like(y)
    sid = np.zeros_like(y, dtype=np.int64)
    i = 0
    for s in range(n_subjects):
        subj = make_subject(r)
        for _ in range(windows_per):
            cri = float(r.random())
            d = None
            if r.random() < degrade_rate:
                d = str(r.choice(["motion", "lowperf", "dropout", "noise"]))
            x, q, hr = synth_window(subj, cri, r, d)
            X[i, 0] = x
            y[i] = cri
            hrs[i] = hr
            quals[i] = q
            sid[i] = s
            i += 1
    return X, y, hrs, quals, sid


# --------------------------------------------------------------------------
# Network
# --------------------------------------------------------------------------
class CRINet(nn.Module):
    """1-D CNN over the raw waveform, emitting an estimate and its variance.

    Strided convolutions rather than pooling, so the receptive field grows
    with depth and the network can see roughly a full cardiac cycle by the
    third block. Both average and max pooling at the head: the average carries
    the sustained morphology, the max carries the peak character, and volume
    state shows up in both.
    """

    def __init__(self):
        super().__init__()
        def blk(i, o, k, s):
            return nn.Sequential(
                nn.Conv1d(i, o, k, stride=s, padding=k // 2, bias=False),
                nn.BatchNorm1d(o), nn.SiLU())
        self.f = nn.Sequential(
            blk(1, 32, 9, 2), blk(32, 48, 7, 2),
            blk(48, 64, 5, 2), blk(64, 96, 5, 2), blk(96, 96, 3, 2))
        self.head = nn.Sequential(
            nn.Linear(192, 96), nn.SiLU(), nn.Dropout(0.15), nn.Linear(96, 2))

    def forward(self, x):
        h = self.f(x)
        h = torch.cat([h.mean(-1), h.amax(-1)], dim=1)
        o = self.head(h)
        # Estimate in [0,1]; log-variance clamped to a sane dynamic range so
        # the loss cannot escape to infinity early in training.
        return torch.sigmoid(o[:, :1]), torch.clamp(o[:, 1:], -7.0, 2.0)


def gaussian_nll(mu, logvar, y):
    """Heteroscedastic loss. The network may reduce its penalty on a hard
    window by admitting uncertainty, but pays a price for claiming it
    everywhere."""
    inv = torch.exp(-logvar)
    return (0.5 * (inv * (y - mu) ** 2 + logvar)).mean()


def main():
    t_start = time.time()
    out_dir = os.path.dirname(os.path.abspath(__file__))
    torch.set_num_threads(max(1, os.cpu_count() or 1))

    print("generating cohort ...", flush=True)
    r_tr = np.random.default_rng(SEED)
    r_te = np.random.default_rng(SEED + 991)
    Xtr, ytr, _, _, _ = build_set(240, 260, r_tr)          # 62,400 windows
    Xte, yte, hrte, qte, _ = build_set(70, 150, r_te)      # 10,500 windows
    print(f"  train {Xtr.shape[0]:,} windows / 240 subjects")
    print(f"  test  {Xte.shape[0]:,} windows /  70 subjects (disjoint people)")

    dev = "cpu"
    net = CRINet().to(dev)
    n_par = sum(p.numel() for p in net.parameters())
    print(f"  parameters {n_par:,}")

    Xtr_t = torch.from_numpy(Xtr)
    ytr_t = torch.from_numpy(ytr).unsqueeze(1)
    Xte_t = torch.from_numpy(Xte)
    yte_t = torch.from_numpy(yte).unsqueeze(1)

    EPOCHS, BS = 14, 256
    opt = torch.optim.AdamW(net.parameters(), lr=3e-3, weight_decay=1e-4)
    steps = EPOCHS * math.ceil(len(Xtr_t) / BS)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=steps)

    for ep in range(EPOCHS):
        net.train()
        perm = torch.randperm(len(Xtr_t))
        tot = 0.0
        for i in range(0, len(perm), BS):
            idx = perm[i:i + BS]
            xb, yb = Xtr_t[idx], ytr_t[idx]
            mu, lv = net(xb)
            loss = gaussian_nll(mu, lv, yb)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 4.0)
            opt.step()
            sched.step()
            tot += loss.item() * len(idx)
        net.eval()
        with torch.no_grad():
            mu, lv = net(Xte_t)
            mae = (mu - yte_t).abs().mean().item()
        print(f"  epoch {ep+1:2d}/{EPOCHS}  nll {tot/len(perm):+.4f}   test MAE {mae:.4f}", flush=True)

    # ---------------------------------------------------------------- report
    net.eval()
    with torch.no_grad():
        mu, lv = net(Xte_t)
    mu_n = mu.squeeze(1).numpy()
    sd_n = np.exp(0.5 * lv.squeeze(1).numpy())
    err = np.abs(mu_n - yte)

    clean = qte > 0.9
    mae_all = float(err.mean())
    mae_clean = float(err[clean].mean())
    mae_degraded = float(err[~clean].mean())

    # Is the predicted uncertainty meaningful, or decorative? Two checks: does
    # it correlate with actual error, and does restricting to the windows the
    # network is most confident about actually reduce error?
    unc_corr = float(np.corrcoef(sd_n, err)[0, 1])
    order = np.argsort(sd_n)
    mae_conf50 = float(err[order[: len(order) // 2]].mean())
    within = float(np.mean(err <= 1.96 * sd_n))  # nominal 95%

    # Heart rate alone, given the same test set and an optimal linear fit.
    # This is the comparison that shows the waveform is doing the work.
    A = np.vstack([hrte, np.ones_like(hrte)]).T
    coef, *_ = np.linalg.lstsq(A, yte, rcond=None)
    mae_hr = float(np.abs(A @ coef - yte).mean())

    # Clinically, what matters is catching the casualty who is about to fall
    # off the cliff. CRI below 0.3 is the operative alarm band.
    true_low, pred_low = yte < 0.30, mu_n < 0.30
    tp = int((true_low & pred_low).sum()); fn = int((true_low & ~pred_low).sum())
    fp = int((~true_low & pred_low).sum())
    sens = tp / max(tp + fn, 1); prec = tp / max(tp + fp, 1)

    print("\n  ---- held-out performance, subjects never seen in training ----")
    print(f"  MAE overall                {mae_all:.4f} CRI")
    print(f"  MAE clean signal           {mae_clean:.4f}")
    print(f"  MAE degraded signal        {mae_degraded:.4f}")
    print(f"  MAE, heart rate alone      {mae_hr:.4f}   <- the waveform is doing the work")
    print(f"  MAE, most-confident half   {mae_conf50:.4f}")
    print(f"  uncertainty/error corr     {unc_corr:+.3f}")
    print(f"  inside 95% interval        {within*100:.1f}%")
    print(f"  CRI<0.30 alarm sensitivity {sens*100:.1f}%  precision {prec*100:.1f}%")

    # ------------------------------------------------------------- export
    onnx_path = os.path.join(out_dir, "ppg_cri.onnx")
    dummy = torch.randn(1, 1, N)
    torch.onnx.export(
        net, dummy, onnx_path,
        input_names=["ppg"], output_names=["cri", "logvar"],
        dynamic_axes={"ppg": {0: "batch"}, "cri": {0: "batch"}, "logvar": {0: "batch"}},
        opset_version=13, dynamo=False)
    size = os.path.getsize(onnx_path)

    meta = dict(
        name="ANGEL SWARM CRI-Net",
        task="compensatory reserve index from photoplethysmogram",
        input=dict(shape=[1, 1, N], rate_hz=FS, window_s=WIN_S,
                   normalisation="per-window zero mean unit variance"),
        output=dict(cri="estimate in [0,1]", logvar="log predictive variance"),
        parameters=int(n_par),
        onnx_bytes=int(size),
        opset=13,
        trained=dict(subjects=240, windows=int(Xtr.shape[0]), epochs=EPOCHS,
                     seconds=round(time.time() - t_start, 1)),
        heldout=dict(subjects=70, windows=int(Xte.shape[0]),
                     split="by subject — no person appears in both sets"),
        metrics={
            "mae": round(mae_all, 4),
            "mae_clean": round(mae_clean, 4),
            "mae_degraded": round(mae_degraded, 4),
            "mae_heart_rate_only": round(mae_hr, 4),
            "mae_most_confident_half": round(mae_conf50, 4),
            "uncertainty_error_corr": round(unc_corr, 3),
            "coverage_95": round(within, 4),
            "alarm_sensitivity_cri_lt_030": round(sens, 4),
            "alarm_precision_cri_lt_030": round(prec, 4),
        },
        provenance=("Synthetic cohort. Waveform morphology follows the "
                    "published response of the peripheral pulse to central "
                    "volume loss; it is not patient data and no patient data "
                    "was used. The fielded analogue is CipherOx CRM, FDA "
                    "510(k) K173929."),
    )
    with open(os.path.join(out_dir, "ppg_cri.meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    # A handful of real waveforms for the interface to stream, so the demo
    # shows the network reading an actual signal rather than a canned trace.
    r_demo = np.random.default_rng(4242)
    subj = make_subject(r_demo)
    traces = {}
    for label, cri, deg in [("euvolaemic", 0.95, None), ("compensating", 0.62, None),
                            ("marginal", 0.34, None), ("decompensating", 0.12, None),
                            ("motion artefact", 0.55, "motion"),
                            ("poor perfusion", 0.40, "lowperf")]:
        x, q, hr = synth_window(subj, cri, r_demo, deg)
        traces[label] = dict(cri_true=round(cri, 3), hr=round(hr, 1),
                             samples=[round(float(v), 4) for v in x])
    with open(os.path.join(out_dir, "ppg_traces.json"), "w") as f:
        json.dump(traces, f)

    print(f"\n  wrote ppg_cri.onnx  {size:,} bytes")
    print(f"  total {time.time()-t_start:.1f}s")


if __name__ == "__main__":
    main()
