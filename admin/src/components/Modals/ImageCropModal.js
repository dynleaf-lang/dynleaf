import React, { useCallback, useEffect, useState } from 'react';
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

const ImageCropModal = ({ isOpen, toggle, imageSrc, onCropped, onUseOriginal, aspect = 1, mimeType = 'image/jpeg' }) => {
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
          <div style={{ position: 'relative', width: '100%', height: 320, borderRadius: 8, overflow: 'hidden',
                         backgroundImage: 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)',
                         backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0' }}>
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
        <div className="mt-3">
          <div className="d-flex align-items-center">
            <small className="text-muted mr-3" style={{minWidth: 80}}>Zoom</small>
            <input type="range" min="1" max="5" step="0.1" value={zoom} onChange={(e)=>setZoom(parseFloat(e.target.value))} style={{width:'100%'}} />
          </div>
          <small className="text-muted">Drag to position. Use the slider or mouse wheel to zoom.</small>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={processing}>Cancel</Button>
        {onUseOriginal && (
          <Button color="link" onClick={onUseOriginal} disabled={processing}>Use Original</Button>
        )}
        <Button color="primary" onClick={handleApply} disabled={processing || !croppedAreaPixels}>
          {processing ? <Spinner size="sm" /> : 'Apply'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ImageCropModal;
