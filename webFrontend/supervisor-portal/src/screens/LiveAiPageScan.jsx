import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import Tesseract from 'tesseract.js';
import api from '../config/api';

export default function LiveAIScanPage({ activeBay, onBack }) {
  const [uiState, setUiState] = useState('IDLE'); // IDLE, CV_PROCESSING, VALID, MISMATCH, DUPLICATE
  const [alertMessage, setAlertMessage] = useState('Hybrid Vision Active. Present any QR, Barcode, or Printed Label.');
  const [identifiedText, setIdentifiedText] = useState('');
  const [isStreamActive, setIsStreamActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isProcessingFrame = useRef(false);
  const activeStreamRef = useRef(null);
  const lastOcrTime = useRef(0);

  // 1. Fire Up High-Performance Video Capture Stream
  const startScanningFeed = async () => {
    setUiState('IDLE');
    setAlertMessage('Initializing webcam matrix hardware...');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      activeStreamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsStreamActive(true);
        setAlertMessage('AI Core Armed. Align QR Code or Printed Text (e.g., PKG-101) within camera box.');
        animationFrameRef.current = requestAnimationFrame(executeHybridVisionPipeline);
      }
    } catch (err) {
      console.error(err);
      setAlertMessage('Hardware Error: Camera device permissions rejected.');
    }
  };

  const stopScanningFeed = () => {
    setIsStreamActive(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setUiState('IDLE');
    setAlertMessage('Hybrid Vision Active. Present any QR, Barcode, or Printed Label.');
    setIdentifiedText('');
  };

  // 2. The Core Dual-Inference Multi-Model Processing Loop
  const executeHybridVisionPipeline = async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(executeHybridVisionPipeline);
      return;
    }

    // Prevent overlapping frame processing ticks from choking the browser CPU thread
    if (isProcessingFrame.current || uiState === 'VALID' || uiState === 'MISMATCH') {
      animationFrameRef.current = requestAnimationFrame(executeHybridVisionPipeline);
      return;
    }

    isProcessingFrame.current = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let finalExtractedToken = null;

    // --- PHASE 1: MATRIX GRAPH CODE DECODING OPTION ---
    const qrCodeMatch = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (qrCodeMatch && qrCodeMatch.data) {
      const qrMatch = qrCodeMatch.data.match(/PKG-\d+/);
      if (qrMatch) {
        finalExtractedToken = qrMatch[0];
      }
    }

    // --- PHASE 2: FALLBACK TO DEEP LEARNING NEURAL TEXT EXTRACTOR ---
    const now = Date.now();
    if (!finalExtractedToken && (now - lastOcrTime.current > 1000)) {
      if (canvas.width >= 100 && canvas.height >= 100) {
        lastOcrTime.current = now;
        try {
          // 1. Create a smaller temporary canvas to crop to the center reticle area (180x180 px)
          const ocrCanvas = document.createElement('canvas');
          ocrCanvas.width = 200;
          ocrCanvas.height = 200;
          const ocrCtx = ocrCanvas.getContext('2d');
          
          // Define the crop coordinates (center of the video)
          const cropSize = Math.min(canvas.width, canvas.height) * 0.55; // crop 55% of the frame height
          const sx = (canvas.width - cropSize) / 2;
          const sy = (canvas.height - cropSize) / 2;
          
          // Draw the cropped area
          ocrCtx.drawImage(canvas, sx, sy, cropSize, cropSize, 0, 0, 200, 200);

          // 2. Preprocess: Convert to grayscale and apply thresholding (binarize)
          const imgData = ocrCtx.getImageData(0, 0, 200, 200);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const grayscale = 0.3 * r + 0.59 * g + 0.11 * b;
            // Threshold: if pixel brightness > 120, make it white, else black
            const v = grayscale > 120 ? 255 : 0;
            data[i] = v;     // R
            data[i+1] = v;   // G
            data[i+2] = v;   // B
          }
          ocrCtx.putImageData(imgData, 0, 0);

          // 3. Run Tesseract on the clean cropped image
          const { data: { text } } = await Tesseract.recognize(ocrCanvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' // Optimization mask
          });

          // Use a RegEx token filter to pull your precise serial ID
          const trackingMatch = text.match(/PKG-\d+/);
          if (trackingMatch) {
            finalExtractedToken = trackingMatch[0];
          }
        } catch (ocrErr) {
          console.error("OCR Frame Processing skipped:", ocrErr);
        }
      }
    }

    // --- PHASE 3: INTERCEPT AND SEND DATA ON MATCH ---
    if (finalExtractedToken) {
      setIdentifiedText(finalExtractedToken);
      stopScanningFeed(); // Stop camera instantly to block thread spam

      try {
        setUiState('CV_PROCESSING');
        setAlertMessage("Verifying asset compliance signatures against backend ledger...");
        
        // Ship data off to Spring Boot relational database validator
        const response = await api.post('/verify', {
          packageId: finalExtractedToken,
          bayDoorId: activeBay
        });

        const { status, message } = response.data;
        setUiState(status); // VALID, MISMATCH, or DUPLICATE
        setAlertMessage(message);
      } catch (err) {
        setUiState('MISMATCH');
        setAlertMessage(err.response?.data?.message || 'CRITICAL: Edge Gateway Synchronization Timeout!');
      }
      
      isProcessingFrame.current = false;
      return; // Exit processing pipeline cleanly
    }

    // Cycle back to next animation loop tick if no barcodes or tracking text strings are detected
    isProcessingFrame.current = false;
    animationFrameRef.current = requestAnimationFrame(executeHybridVisionPipeline);
  };

  const handleResetManifest = async () => {
    setAlertMessage('Resetting manifest database ledger...');
    setUiState('IDLE');
    setIdentifiedText('');

    try {
      const response = await api.post('/config/reset-manifest');
      if (response.data.status === 'SUCCESS') {
        setAlertMessage('Success: Dispatched packages archived. Active manifest ready for re-testing!');
        setUiState('IDLE');
      }
    } catch (error) {
      console.error(error);
      setAlertMessage('Network Sync Error: Could not reach Spring Boot system engine.');
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="card-container">
      <div className={`dashboard-card wide-card ${uiState === 'VALID' ? 'success-card-bg' : uiState === 'MISMATCH' ? 'error-card-bg' : uiState === 'DUPLICATE' ? 'duplicate-card-bg' : ''}`}>
        <h3>2. Live Feed Video Detection & Alarm Terminal</h3>
        <p className="card-desc">Hybrid Computer Vision Monitoring Active at Bay ID: <strong style={{color: '#66fcf1'}}>{activeBay}</strong></p>

        <div className="viewport-box">
          <video ref={videoRef} autoPlay playsInline muted className={`video-feed ${!isStreamActive ? 'hidden' : ''}`} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!isStreamActive && (
            <div className="status-overlay">
              <span className="status-title-badge">{uiState === 'CV_PROCESSING' ? 'PROCESSING' : uiState}</span>
              <p className="status-msg-desc">{alertMessage}</p>
            </div>
          )}
          {isStreamActive && <div className="scanner-target-reticle" />}
        </div>

        {identifiedText && (
          <div className="ocr-readout-panel">
            LABEL DATA ISOLATED VIA AUTOMATED INTEGRATED AGENTS: <span>{identifiedText}</span>
          </div>
        )}

        <div className="action-row" style={{ marginBottom: '10px' }}>
          <button onClick={isStreamActive ? stopScanningFeed : startScanningFeed} className={`action-btn cam-btn ${isStreamActive ? 'stop-btn' : 'start-btn'}`}>
            {isStreamActive ? 'Kill Live Feed Stream' : 'Initialize Hybrid Scanner Feed'}
          </button>
          
          <button onClick={() => { stopScanningFeed(); onBack(); }} className="action-btn secondary-btn">
            ◀ Reconfigure Bay Options
          </button>
        </div>

        <button type="button" onClick={handleResetManifest} className="action-btn secondary-btn" style={{ width: '100%', borderColor: '#66fcf1', color: '#66fcf1' }}>
          Refresh Record
        </button>
      </div>
    </div>
  );
}