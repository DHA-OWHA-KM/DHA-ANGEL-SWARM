#!/usr/bin/env python3
"""Calibrate the operational trust thresholds against the model's own behaviour.

The interface needs to tell an operator whether a reading can be acted on.
Picking the cut-offs by eye would make the most important claim in the system
— "the model knows when it does not know" — an assertion. This measures them
instead, on a fresh cohort the model has never seen, and writes the result
into the model card the interface reads at run time.

The question being answered is: how wide does the predicted interval get on a
signal that is genuinely clean, and how much wider on one that is not? The
answer becomes the boundary between "act on this" and "do not".
"""
import json
import os

import numpy as np
import onnxruntime as ort

import ppg_cri as P  # reuse the exact generator the network was trained on

HERE = os.path.dirname(os.path.abspath(__file__))
N_CLEAN, N_DEG, N_SUBJ = 5000, 3000, 120


def batch(sess, X):
    """Run in chunks; the exported graph has a dynamic batch axis."""
    mus, sds = [], []
    for i in range(0, len(X), 512):
        c, lv = sess.run(["cri", "logvar"], {"ppg": X[i:i + 512]})
        mus.append(c[:, 0])
        sds.append(np.exp(0.5 * lv[:, 0]))
    return np.concatenate(mus), np.concatenate(sds)


def main():
    sess = ort.InferenceSession(os.path.join(HERE, "ppg_cri.onnx"),
                                providers=["CPUExecutionProvider"])
    r = np.random.default_rng(20260814)

    def make(n, degraded):
        X = np.zeros((n, 1, P.N), dtype=np.float32)
        y = np.zeros(n, dtype=np.float32)
        subs = [P.make_subject(r) for _ in range(N_SUBJ)]
        for i in range(n):
            s = subs[int(r.integers(0, N_SUBJ))]
            cri = float(r.random())
            d = str(r.choice(["motion", "lowperf", "dropout", "noise"])) if degraded else None
            x, _, _ = P.synth_window(s, cri, r, d)
            X[i, 0] = x
            y[i] = cri
        return X, y

    print("generating calibration cohort ...", flush=True)
    Xc, yc = make(N_CLEAN, False)
    Xd, yd = make(N_DEG, True)

    mc, sc = batch(sess, Xc)
    md, sd = batch(sess, Xd)

    wc = 2 * 1.96 * sc          # interval width on clean signal
    wd = 2 * 1.96 * sd          # interval width on degraded signal

    # Operational boundaries. "Act" is set at the clean-signal 75th percentile:
    # three quarters of genuinely clean readings clear it. "Refuse" is set
    # where a clean reading is already unusual — the clean 97th percentile —
    # so that crossing it really does mean something is wrong with the signal
    # rather than merely that the casualty sits in the harder middle of the
    # range, where the model is honestly less certain.
    act = float(np.percentile(wc, 75))
    refuse = float(np.percentile(wc, 97))

    def rate(w, lo, hi):
        return float(np.mean((w >= lo) & (w < hi)))

    err_c = np.abs(mc - yc)
    err_d = np.abs(md - yd)
    trusted = wc < act
    untrusted = wc >= refuse

    out = dict(
        act_below=round(act, 4),
        refuse_above=round(refuse, 4),
        clean=dict(
            median_width=round(float(np.median(wc)), 4),
            p75=round(act, 4), p97=round(refuse, 4),
            share_act=round(rate(wc, 0, act), 4),
            share_caution=round(rate(wc, act, refuse), 4),
            share_refuse=round(float(np.mean(wc >= refuse)), 4),
        ),
        degraded=dict(
            median_width=round(float(np.median(wd)), 4),
            share_act=round(rate(wd, 0, act), 4),
            share_caution=round(rate(wd, act, refuse), 4),
            share_refuse=round(float(np.mean(wd >= refuse)), 4),
        ),
        # The payoff line: restricting to readings the model calls actionable
        # should measurably reduce error. If it does not, the uncertainty head
        # is decorative and this whole design claim is wrong.
        mae_when_actionable=round(float(err_c[trusted].mean()), 4),
        mae_when_refused=round(float(err_c[untrusted].mean()), 4) if untrusted.any() else None,
        mae_degraded_overall=round(float(err_d.mean()), 4),
        mae_degraded_when_actionable=round(float(err_d[wd < act].mean()), 4) if (wd < act).any() else None,
        cohort=dict(clean=N_CLEAN, degraded=N_DEG, subjects=N_SUBJ),
    )

    print(json.dumps(out, indent=2))

    meta_path = os.path.join(HERE, "ppg_cri.meta.json")
    meta = json.load(open(meta_path))
    meta["trust"] = out
    json.dump(meta, open(meta_path, "w"), indent=2)
    print("\nwrote trust thresholds into ppg_cri.meta.json")


if __name__ == "__main__":
    main()
