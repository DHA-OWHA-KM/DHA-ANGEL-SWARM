# CRI-Net — training run

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The recorded output of the run that produced `ppg_cri.onnx`, written by `ppg_cri.py` as it trained. It is reproduced in full from `train.log`, which remains the authoritative copy; the log is 33 lines and nothing has been excerpted.

## What was trained

CRI-Net, a 104,162-parameter one-dimensional convolutional network that reads a five-second photoplethysmogram window — `float32[1, 1, 500]` at 100 Hz — and emits a compensatory reserve index in [0, 1] together with a log predictive variance, trained under a Gaussian negative log-likelihood so the network reports its own uncertainty rather than having one attached afterwards.

The cohort is synthetic. 62,400 windows over 240 subjects were used for training and 10,500 windows over 70 subjects for the held-out test, **split by subject**, so no person appears in both sets. Fourteen epochs, 632.6 seconds in total. The waveform morphology follows the published response of the peripheral pulse to central volume loss; it is not patient data and no patient data was used.

## Final held-out metrics

Measured on subjects never seen in training:

| Measure | Value |
|---|---|
| MAE overall | 0.0694 CRI |
| MAE, clean signal | 0.0641 |
| MAE, degraded signal | 0.0879 |
| MAE, heart rate alone | 0.1588 |
| MAE, most-confident half | 0.0529 |
| Uncertainty / error correlation | +0.351 |
| Inside the 95% interval | 96.2% |
| Alarm sensitivity at CRI < 0.30 | 83.2% |
| Alarm precision at CRI < 0.30 | 85.4% |

The heart-rate-only figure is the load-bearing one and the log marks it as such: at 0.1588 against 0.0694, a model leaning on heart rate alone does roughly twice as badly, which is the check that the waveform is doing the work. The uncertainty is useful rather than decorative — it correlates with error at +0.351, the most-confident half of the predictions are markedly better than the whole, and the nominal 95% interval covers 96.2% of cases.

The exported graph is 419,797 bytes. The thresholds that turn these numbers into an act / do-not-act boundary are measured separately by `calibrate.py` and written into `ppg_cri.meta.json`.

## The log

```text
generating cohort ...
  train 62,400 windows / 240 subjects
  test  10,500 windows /  70 subjects (disjoint people)
  parameters 104,162
  epoch  1/14  nll -1.2994   test MAE 0.0935
  epoch  2/14  nll -1.6493   test MAE 0.0937
  epoch  3/14  nll -1.6894   test MAE 0.0792
  epoch  4/14  nll -1.7199   test MAE 0.0744
  epoch  5/14  nll -1.7501   test MAE 0.0752
  epoch  6/14  nll -1.7702   test MAE 0.1030
  epoch  7/14  nll -1.7816   test MAE 0.0799
  epoch  8/14  nll -1.7973   test MAE 0.0734
  epoch  9/14  nll -1.8280   test MAE 0.0712
  epoch 10/14  nll -1.8460   test MAE 0.0709
  epoch 11/14  nll -1.8721   test MAE 0.0721
  epoch 12/14  nll -1.8906   test MAE 0.0696
  epoch 13/14  nll -1.9109   test MAE 0.0694
  epoch 14/14  nll -1.9233   test MAE 0.0694

  ---- held-out performance, subjects never seen in training ----
  MAE overall                0.0694 CRI
  MAE clean signal           0.0641
  MAE degraded signal        0.0879
  MAE, heart rate alone      0.1588   <- the waveform is doing the work
  MAE, most-confident half   0.0529
  uncertainty/error corr     +0.351
  inside 95% interval        96.2%
  CRI<0.30 alarm sensitivity 83.2%  precision 85.4%
/home/claude/angel/train/ppg_cri.py:356: DeprecationWarning: You are using the legacy TorchScript-based ONNX export. Starting in PyTorch 2.9, the new torch.export-based ONNX exporter has become the default. Learn more about the new export logic: https://docs.pytorch.org/docs/stable/onnx_export.html. For exporting control flow: https://pytorch.org/tutorials/beginner/onnx/export_control_flow_model_to_onnx_tutorial.html
  torch.onnx.export(

  wrote ppg_cri.onnx  419,797 bytes
  total 632.6s
```

Two things in the log are worth noting rather than glossing. The test MAE is not monotonic — epoch 6 reads 0.1030, worse than epoch 3 — which is ordinary training noise on a held-out set of this size, and the run was not stopped at the best epoch but taken to fourteen, ending at 0.0694. And the export emits a `DeprecationWarning`: the graph was written by PyTorch's legacy TorchScript-based ONNX exporter, not the newer `torch.export`-based one. The warning names an absolute path from the machine the run was performed on, which is why the log carries `/home/claude/angel/train/ppg_cri.py` rather than a path in this repository.
