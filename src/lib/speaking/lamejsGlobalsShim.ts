/* Workaround for a bug in lamejs 1.2.1 itself: see the long comment in
   src/types/lamejs.d.ts for the full story. Short version: several of
   lamejs's own internal files reference sibling classes (MPEGMode, Lame,
   BitStream, ...) as bare global identifiers instead of requiring them,
   which only worked in the project's original all-in-one-scope browser
   bundle (lame.all.js), not in the per-file CommonJS modules a real
   bundler sees. Importing every submodule here and hanging each one onto
   globalThis under its class name restores exactly what those files were
   already assuming was there. This file only has side effects, import it
   once for those side effects (encode.ts does, before constructing any
   Mp3Encoder) and don't import anything from it. */

import ATH from 'lamejs/src/js/ATH.js';
import BitStream from 'lamejs/src/js/BitStream.js';
import CBRNewIterationLoop from 'lamejs/src/js/CBRNewIterationLoop.js';
import CalcNoiseData from 'lamejs/src/js/CalcNoiseData.js';
import CalcNoiseResult from 'lamejs/src/js/CalcNoiseResult.js';
import Encoder from 'lamejs/src/js/Encoder.js';
import FFT from 'lamejs/src/js/FFT.js';
import GainAnalysis from 'lamejs/src/js/GainAnalysis.js';
import GrInfo from 'lamejs/src/js/GrInfo.js';
import IIISideInfo from 'lamejs/src/js/IIISideInfo.js';
import III_psy_ratio from 'lamejs/src/js/III_psy_ratio.js';
import III_psy_xmin from 'lamejs/src/js/III_psy_xmin.js';
import L3Side from 'lamejs/src/js/L3Side.js';
import Lame from 'lamejs/src/js/Lame.js';
import LameGlobalFlags from 'lamejs/src/js/LameGlobalFlags.js';
import LameInternalFlags from 'lamejs/src/js/LameInternalFlags.js';
import MPEGMode from 'lamejs/src/js/MPEGMode.js';
import MeanBits from 'lamejs/src/js/MeanBits.js';
import NewMDCT from 'lamejs/src/js/NewMDCT.js';
import NsPsy from 'lamejs/src/js/NsPsy.js';
import Presets from 'lamejs/src/js/Presets.js';
import PsyModel from 'lamejs/src/js/PsyModel.js';
import Quantize from 'lamejs/src/js/Quantize.js';
import QuantizePVT from 'lamejs/src/js/QuantizePVT.js';
import ReplayGain from 'lamejs/src/js/ReplayGain.js';
import Reservoir from 'lamejs/src/js/Reservoir.js';
import ScaleFac from 'lamejs/src/js/ScaleFac.js';
import Tables from 'lamejs/src/js/Tables.js';
import Takehiro from 'lamejs/src/js/Takehiro.js';
import VBRQuantize from 'lamejs/src/js/VBRQuantize.js';
import VBRSeekInfo from 'lamejs/src/js/VBRSeekInfo.js';
import VBRTag from 'lamejs/src/js/VBRTag.js';
import Version from 'lamejs/src/js/Version.js';

Object.assign(globalThis, {
  ATH,
  BitStream,
  CBRNewIterationLoop,
  CalcNoiseData,
  CalcNoiseResult,
  Encoder,
  FFT,
  GainAnalysis,
  GrInfo,
  IIISideInfo,
  III_psy_ratio,
  III_psy_xmin,
  L3Side,
  Lame,
  LameGlobalFlags,
  LameInternalFlags,
  MPEGMode,
  MeanBits,
  NewMDCT,
  NsPsy,
  Presets,
  PsyModel,
  Quantize,
  QuantizePVT,
  ReplayGain,
  Reservoir,
  ScaleFac,
  Tables,
  Takehiro,
  VBRQuantize,
  VBRSeekInfo,
  VBRTag,
  Version,
});
