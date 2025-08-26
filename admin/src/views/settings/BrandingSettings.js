import React, { useEffect, useState, useContext, useRef } from 'react';
import { Card, CardHeader, CardBody, Container, Row, Col, Form, FormGroup, Label, Input, Button, Alert, Spinner } from 'reactstrap';
import Header from 'components/Headers/Header.js';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import ImageCropModal from '../../components/Modals/ImageCropModal';
import imageCompression from 'browser-image-compression';
import BrandingLogoUploader from './components/BrandingLogoUploader';

const BrandingSettings = () => {
  const { user } = useContext(AuthContext);
  const [restaurant, setRestaurant] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState('');
  const cropResolveRef = useRef(null);

  const canEdit = user?.role === 'Super_Admin' || user?.role === 'Branch_Manager';

  const fetchRestaurant = async () => {
    try {
      setError(null);
      // Super_Admin can select; for now, if user has restaurantId use it; else fetch first restaurant
      let restaurantId = user?.restaurantId;
      if (!restaurantId) {
        const res = await api.get('/restaurants');
        const first = Array.isArray(res.data) && res.data.length ? res.data[0] : null;
        if (first) restaurantId = first._id;
      }
      if (!restaurantId) {
        setError('No restaurant found to edit branding.');
        return;
      }
      const { data } = await api.get(`/restaurants/${restaurantId}`);
      setRestaurant(data);
      setBrandName(data.brandName || '');
      setLogoUrl(data.logo || '');
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to load restaurant.');
    }
  };

  useEffect(() => {
    fetchRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Convert to data URL for crop modal
      const reader = new FileReader();
      const fileSrc = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Open crop modal and wait for the result
      const cropResult = await new Promise((resolve) => {
        cropResolveRef.current = resolve;
        setPendingImageSrc(fileSrc);
        setShowCrop(true);
      });

      // If user canceled crop
      if (!cropResult) {
        setShowCrop(false);
        setUploading(false);
        return;
      }

      // Choose source: cropped blob or original file
      const sourceBlob = cropResult === 'ORIGINAL' ? file : cropResult;

      // Compress image
      const compressed = await imageCompression(sourceBlob, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 512,
        useWebWorker: true
      });

      // Upload
      const formData = new FormData();
      const origName = (file && file.name) ? file.name.replace(/\.[^/.]+$/, '') : 'logo';
      const ext = (compressed.type && compressed.type.split('/')[1]) || 'jpg';
      const uploadFile = new File([compressed], `${origName}_${Date.now()}.${ext}`, { type: compressed.type || 'image/jpeg' });
      formData.append('image', uploadFile);

      const res = await api.post('/upload', formData);
      const url = res.data?.file?.url || res.data?.url || res.data?.imageUrl || res.data?.file?.path;
      if (!url) throw new Error('Upload did not return a URL');

      setLogoUrl(url);
      setSuccess('Logo uploaded successfully.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'Failed to upload logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;
    setSaving(true);
    setError(null);
    try {
      // Try to delete physical file if it's within our uploads folder
      const match = logoUrl.match(/\/uploads\/([^/?#]+)/);
      if (match && match[1]) {
        try { await api.delete(`/upload/${match[1]}`); } catch (_) {}
      }
      // Clear on restaurant
      await api.put(`/restaurants/${restaurant._id}`, {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        postalCode: restaurant.postalCode,
        country: restaurant.country,
        phone: restaurant.phone,
        email: restaurant.email,
        openingHours: restaurant.openingHours,
        brandName: brandName || undefined,
        logo: ''
      });
      setLogoUrl('');
      setSuccess('Logo removed.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to delete logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant?._id) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/restaurants/${restaurant._id}`, {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        postalCode: restaurant.postalCode,
        country: restaurant.country,
        phone: restaurant.phone,
        email: restaurant.email,
        openingHours: restaurant.openingHours,
        brandName: brandName || undefined,
        logo: logoUrl || undefined
      });
      setSuccess('Branding saved.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Card className="shadow"> 
              <CardHeader className="border-0 d-flex justify-content-between align-items-center">
                <h3 className="mb-0">Branding</h3>
                <small className="text-muted">Set brand name and logo</small>
              </CardHeader>
              <CardBody>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}

                {!restaurant ? (
                  <div className="text-center my-4">
                    <Spinner color="primary" />
                  </div>
                ) : (
                  <Form onSubmit={(e)=>{e.preventDefault(); if(canEdit) handleSave();}}>
                    <Row>
                      <Col md="4">
                        <FormGroup>
                          <Label>Brand Name</Label>
                          <Input
                            type="text"
                            placeholder="e.g., OrderEase Cafe"
                            value={brandName}
                            onChange={(e)=>setBrandName(e.target.value)}
                            disabled={!canEdit}
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <BrandingLogoUploader
                          logoUrl={logoUrl}
                          canEdit={canEdit}
                          uploading={uploading}
                          saving={saving}
                          onSelectFile={handleUpload}
                          onDelete={handleDeleteLogo}
                        />
                      </Col>
                    </Row>

                    <div className="mt-3">
                      <Button color="primary" type="submit" disabled={!canEdit || saving}>
                        {saving ? <Spinner size="sm" /> : 'Save Changes'}
                      </Button>
                    </div>
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
      {/* Crop Modal */}
      <ImageCropModal
        isOpen={showCrop}
        toggle={() => { setShowCrop(false); if (cropResolveRef.current) { cropResolveRef.current(null); cropResolveRef.current = null; } }}
        imageSrc={pendingImageSrc}
        aspect={1}
        onCropped={(blob)=>{ if (cropResolveRef.current) { cropResolveRef.current(blob); cropResolveRef.current = null; } }}
        onUseOriginal={() => { if (cropResolveRef.current) { cropResolveRef.current('ORIGINAL'); cropResolveRef.current = null; setShowCrop(false);} }}
      />
    </>
  );
};

export default BrandingSettings;

