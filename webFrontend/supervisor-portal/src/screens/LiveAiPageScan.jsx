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

  // 1. Fire Up High-Performance Video Capture Stream
  const startScanningFeed = async () => {
    setUiState('IDLE');
    setAlertMessage('Initializing webcam matrix hardware...');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
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
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
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
      finalExtractedToken = qrCodeMatch.data;
    }

    // --- PHASE 2: FALLBACK TO DEEP LEARNING NEURAL TEXT EXTRACTOR ---
    if (!finalExtractedToken) {
      try {
        // Sample every few frames for OCR to optimize processing speeds
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' // Optimization mask
        });

        // Use a RegEx token filter to pull your precise serial ID from addresses or background text noise
        const trackingMatch = text.match(/PKG-\d+/);
        if (trackingMatch) {
          finalExtractedToken = trackingMatch[0];
        }
      } catch (ocrErr) {
        console.error("OCR Frame Processing skipped:", ocrErr);
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

  useEffect(() => {
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, []);

  return (
    <div className="card-container">
      <div className={`dashboard-card wide-card ${uiState === 'VALID' ? 'success-card-bg' : uiState === 'MISMATCH' ? 'error-card-bg' : ''}`}>
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

        <div className="action-row">
          <button onClick={isStreamActive ? stopScanningFeed : startScanningFeed} className={`action-btn cam-btn ${isStreamActive ? 'stop-btn' : 'start-btn'}`}>
            {isStreamActive ? 'Kill Live Feed Stream' : 'Initialize Hybrid Scanner Feed'}
          </button>
          
          <button onClick={() => { stopScanningFeed(); onBack(); }} className="action-btn secondary-btn">
            ◀ Reconfigure Bay Options
          </button>
        </div>
      </div>
    </div>
  );
}