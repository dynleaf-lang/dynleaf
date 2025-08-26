import React from 'react';
import { Button, Spinner, FormGroup, Label } from 'reactstrap';

const boxStyle = {
  width: 80,
  height: 80,
  border: '1px solid #eee',
  borderRadius: 8,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent', // keep transparent to respect logo transparency
  position: 'relative'
};

const BrandingLogoUploader = ({
  logoUrl,
  canEdit,
  uploading,
  saving,
  onSelectFile,
  onDelete
}) => {
  return (
    <FormGroup>
      <Label>Logo</Label>
      <div className="d-flex align-items-center">
        <div style={boxStyle} aria-label="Logo preview">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <span className="text-muted" style={{ fontSize: 12 }}>No logo</span>
          )}
        </div>
        <div className="ml-3 d-flex align-items-center">
          <Button color="secondary" type="button" disabled={!canEdit || uploading} className="mr-2">
            <label className="mb-0" style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}>
              {uploading ? 'Uploading...' : 'Upload Logo'}
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f && onSelectFile) onSelectFile(f); e.target.value = ''; }}
                style={{ display: 'none' }}
              />
            </label>
          </Button>
          {logoUrl && (
            <Button
              color="danger"
              type="button"
              outline
              disabled={!canEdit || saving}
              onClick={() => { if (!onDelete) return; const ok = window.confirm('Remove the current logo?'); if (ok) onDelete(); }}
            >
              {saving ? <Spinner size="sm" /> : 'Delete Logo'}
            </Button>
          )}
        </div>
      </div>
    </FormGroup>
  );
};

export default BrandingLogoUploader;
