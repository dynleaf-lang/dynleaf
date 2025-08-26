import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner
} from 'reactstrap';

// Utility to create cropped image blob
function getCroppedImg(imageSrc, cropAreaPixels, rotation = 0, mimeType = 'image/jpeg', quality = 0.9) {
  return new Promise(async (resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const { width, height, x, y } = cropAreaPixels;
      canvas.width = width;
      canvas.height = height;

      ctx.save();
      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas is empty'));
        resolve(blob);
      }, mimeType, quality);
    };
    image.onerror = (e) => reject(e);
  });
}

const ImageCropModal = ({ isOpen, toggle, imageSrc, onCropped, aspect = 1, mimeType = 'image/jpeg' }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setProcessing(false);
    }
  }, [isOpen]);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 0, mimeType);
      onCropped && onCropped(blob);
      toggle();
    } catch (e) {
      console.error(e);
      // swallow error; parent can show message via onCropped failure
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalHeader toggle={toggle}>Crop Image</ModalHeader>
      <ModalBody>
        {imageSrc ? (
          <div style={{ position: 'relative', width: '100%', height: 300, background: '#333', borderRadius: 8, overflow: 'hidden' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition
            />
          </div>
        ) : (
          <div style={{ height: 300 }} />
        )}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">Drag to position. Use wheel/pinch to zoom.</small>
          <div>
            <Button size="sm" onClick={() => setZoom((z) => Math.max(1, z - 0.2))} className="mr-2">-</Button>
            <Button size="sm" onClick={() => setZoom((z) => Math.min(5, z + 0.2))}>+</Button>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={processing}>Cancel</Button>
        <Button color="primary" onClick={handleApply} disabled={processing || !croppedAreaPixels}>
          {processing ? <Spinner size="sm" /> : 'Apply'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ImageCropModal;
