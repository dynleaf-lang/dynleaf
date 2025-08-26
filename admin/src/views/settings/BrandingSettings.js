import React, { useEffect, useState, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  Spinner
} from 'reactstrap';
import Header from 'components/Headers/Header.js';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import ImageCropModal from '../../components/Modals/ImageCropModal';
import imageCompression from 'browser-image-compression';

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
      // 1) Open crop modal first
      const reader = new FileReader();
      const fileSrc = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Show crop modal and wait for cropped blob
      const croppedBlob = await new Promise((resolve) => {
        setPendingImageSrc(fileSrc);
        setShowCrop(true);
        // We will temporarily attach a listener via a ref-like closure
        const onCropped = (blob) => resolve(blob);
        // Store handler on window for a moment to bridge modal callback
        window.__brandingOnCropped = onCropped;
      });

      // If user canceled crop
      if (!croppedBlob) {
        setShowCrop(false);
        setUploading(false);
        return;
      }

      // 2) Compress cropped image
      const compressed = await imageCompression(croppedBlob, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 512,
        useWebWorker: true
      });

      // 3) Upload
      const formData = new FormData();
      const uploadFile = new File([compressed], `logo_${Date.now()}.jpg`, { type: compressed.type || 'image/jpeg' });
      formData.append('image', uploadFile);
      const res = await api.post('/upload', formData);
      const url = res.data?.file?.url || res.data?.url || res.data?.imageUrl || res.data?.file?.path;
      if (!url) throw new Error('Upload did not return a URL');
      setLogoUrl(url);
      setSuccess('Logo uploaded successfully.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to upload logo.');
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
                      <Col md="6">
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
                        <FormGroup>
                          <Label>Logo</Label>
                          <div className="d-flex align-items-center">
                            <div style={{width:80,height:80,border:'1px solid #eee',borderRadius:8,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#fafafa'}}>
                              {logoUrl ? (
                                <img src={logoUrl} alt="logo" style={{maxWidth:'100%', maxHeight:'100%'}} />
                              ) : (
                                <span className="text-muted" style={{fontSize:12}}>No logo</span>
                              )}
                            </div>
                            <div className="ml-3">
                              <Button color="secondary" type="button" disabled={!canEdit || uploading}>
                                <label className="mb-0" style={{cursor: canEdit ? 'pointer':'not-allowed'}}>
                                  {uploading ? 'Uploading...' : 'Upload Logo'}
                                  <input
                                    type="file"
                                    name="image"
                                    accept="image/*"
                                    onChange={(e)=>{ const f = e.target.files && e.target.files[0]; if (f) handleUpload(f); e.target.value = ''; }}
                                    style={{display:'none'}}
                                  />
                                </label>
                              </Button>
                              {logoUrl && (
                                <Button color="danger" type="button" className="ml-2" outline disabled={!canEdit || saving} onClick={handleDeleteLogo}>
                                  {saving ? <Spinner size="sm" /> : 'Delete Logo'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </FormGroup>
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
  toggle={() => { setShowCrop(false); if (window.__brandingOnCropped) { try { window.__brandingOnCropped(null); } catch(_){} } delete window.__brandingOnCropped; }}
        imageSrc={pendingImageSrc}
        aspect={1}
        onCropped={(blob)=>{ if (window.__brandingOnCropped) { window.__brandingOnCropped(blob); delete window.__brandingOnCropped; }}}
      />
    </>
  );
};

export default BrandingSettings;

