const barcodeFormats = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "codabar",
];

const cameraConstraints = {
  audio: false,
  video: {
    facingMode: {
      ideal: "environment",
    },
    width: {
      ideal: 1920,
    },
    height: {
      ideal: 1080,
    },
  },
};

const createCameraError = (error) => {
  if (error.name == "NotAllowedError" || error.name == "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access for this site and reload the scanner.";
  }

  if (error.name == "NotFoundError" || error.name == "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }

  if (error.name == "NotReadableError" || error.name == "TrackStartError") {
    return "The camera is already in use by another app. Close it and try again.";
  }

  return `Could not start the camera: ${error.message || error.name}`;
};

const createBarcodeHandler = (onDetected) => {
  let lastBarcode = "";
  let resetTimer = null;

  return (barcode) => {
    const value = String(barcode || "").trim();

    if (value == "") {
      return;
    }

    if (value != lastBarcode) {
      lastBarcode = value;
      onDetected(value);
    }

    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      lastBarcode = "";
    }, 1500);
  };
};

const selectRearCamera = async (stream) => {
  let devices = [];

  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch (error) {
    return stream;
  }

  const rearCamera = devices.find((device) => {
    return device.kind == "videoinput" && /back|rear|environment|world/i.test(device.label);
  });

  if (!rearCamera) {
    return stream;
  }

  const activeCameraId = stream.getVideoTracks()[0]?.getSettings().deviceId;

  if (rearCamera.deviceId == activeCameraId) {
    return stream;
  }

  stream.getTracks().forEach((track) => track.stop());

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId: {
          exact: rearCamera.deviceId,
        },
        width: {
          ideal: 1920,
        },
        height: {
          ideal: 1080,
        },
      },
    });
  } catch (error) {
    return navigator.mediaDevices.getUserMedia(cameraConstraints);
  }
};

const startNativeBarcodeDetector = async (video, stream, onDetected, onStatus) => {
  if (!("BarcodeDetector" in window) || !window.BarcodeDetector.getSupportedFormats) {
    return null;
  }

  let supportedFormats = [];

  try {
    supportedFormats = await window.BarcodeDetector.getSupportedFormats();
  } catch (error) {
    return null;
  }

  const formats = barcodeFormats.filter((format) => supportedFormats.includes(format));

  if (formats.length == 0) {
    return null;
  }

  let detector = null;

  try {
    detector = new window.BarcodeDetector({ formats });
  } catch (error) {
    return null;
  }

  let scanInProgress = false;
  let stopped = false;
  let timeoutId = null;
  let detectionErrorShown = false;
  const handleBarcode = createBarcodeHandler(onDetected);

  const scanFrame = async () => {
    if (stopped) {
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !scanInProgress) {
      scanInProgress = true;

      try {
        const results = await detector.detect(video);

        results.forEach((result) => {
          handleBarcode(result.rawValue);
        });
      } catch (error) {
        if (!detectionErrorShown) {
          onStatus(`Camera is active, but could not read this frame: ${error.message}`);
          detectionErrorShown = true;
        }
      }

      scanInProgress = false;
    }

    timeoutId = window.setTimeout(scanFrame, 150);
  };

  video.srcObject = stream;
  await video.play();

  const cameraName = stream.getVideoTracks()[0]?.label || "rear camera";
  onStatus(`Camera active (${cameraName}). Center the barcode and hold the phone steady.`);
  scanFrame();

  return {
    stop: () => {
      stopped = true;
      window.clearTimeout(timeoutId);
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
};

const startZxingBarcodeReader = async (video, stream, onDetected, onStatus) => {
  if (!window.ZXingBrowser?.BrowserMultiFormatReader) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Barcode decoder could not be loaded. Check the internet connection and reload.");
  }

  const activeTrack = stream.getVideoTracks()[0];
  const activeCameraId = activeTrack?.getSettings().deviceId;
  const rearCamera = activeTrack?.label || "rear camera";
  const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
  const handleBarcode = createBarcodeHandler(onDetected);

  stream.getTracks().forEach((track) => track.stop());

  const devices = await window.ZXingBrowser.BrowserCodeReader.listVideoInputDevices();
  const selectedCamera = devices.find((device) => {
    return /back|rear|environment|world/i.test(device.label);
  });

  const controls = await reader.decodeFromVideoDevice(
    selectedCamera?.deviceId || activeCameraId || undefined,
    video,
    (result) => {
      if (!result) {
        return;
      }

      handleBarcode(result.getText());
    },
  );

  const cameraName = selectedCamera?.label || rearCamera;
  onStatus(`Camera active (${cameraName}). Center the barcode and hold the phone steady.`);

  return {
    stop: () => {
      controls.stop();
      video.srcObject = null;
    },
  };
};

export const startBarcodeCamera = async (video, onDetected, onError, onStatus = () => {}) => {
  if (!window.isSecureContext) {
    onError("Camera needs a trusted HTTPS connection. Open this page on HTTPS; an untrusted certificate will still block the camera.");
    return null;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    onError("This browser cannot access the camera. Open the scanner in Chrome or another camera-enabled browser.");
    return null;
  }

  video.setAttribute("playsinline", "true");
  video.muted = true;

  let stream = null;

  try {
    onStatus("Requesting camera permission...");

    stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
    stream = await selectRearCamera(stream);

    const nativeControls = await startNativeBarcodeDetector(
      video,
      stream,
      onDetected,
      onStatus,
    );

    if (nativeControls) {
      return nativeControls;
    }

    return await startZxingBarcodeReader(video, stream, onDetected, onStatus);
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    onError(createCameraError(error));
    return null;
  }
};
