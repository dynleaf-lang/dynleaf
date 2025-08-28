import React from 'react';
import { Button, FormGroup, Label, Input, Row, Col, InputGroup, InputGroupAddon, InputGroupText } from 'reactstrap';

export default function VariantGroupsEditor({ value = [], onChange, currencySymbol }) {
  const groups = Array.isArray(value) ? value : [];

  const updateGroup = (idx, patch) => {
    const next = groups.map((g, i) => (i === idx ? { ...g, ...patch } : g));
    onChange?.(next);
  };

  const addGroup = () => {
    onChange?.([
      ...groups,
      { name: '', selectionType: 'single', options: [{ name: '', price: '', priceDelta: 0 }] },
    ]);
  };

  const removeGroup = (idx) => {
    const next = groups.filter((_, i) => i !== idx);
    onChange?.(next);
  };

  const addOption = (gIdx) => {
    const g = groups[gIdx];
    const nextOpts = [...(g.options || []), { name: '', price: '', priceDelta: 0 }];
    updateGroup(gIdx, { options: nextOpts });
  };

  const updateOption = (gIdx, oIdx, patch) => {
    const g = groups[gIdx];
    const nextOpts = (g.options || []).map((o, i) => (i === oIdx ? { ...o, ...patch } : o));
    updateGroup(gIdx, { options: nextOpts });
  };

  const removeOption = (gIdx, oIdx) => {
    const g = groups[gIdx];
    const nextOpts = (g.options || []).filter((_, i) => i !== oIdx);
    updateGroup(gIdx, { options: nextOpts });
  };

  return (
    <div className="mt-3">
      <Label className="d-flex justify-content-between align-items-center">
        <span>Variant Groups</span>
        <Button color="info" size="sm" onClick={addGroup}>
          <i className="fas fa-plus-circle mr-1"></i> Add Group
        </Button>
      </Label>

      {groups.length === 0 ? (
        <div className="text-center p-3 border rounded mb-3 bg-light">
          <p className="text-muted mb-0">No variant groups added. Use size variants or add a group like "Size" or "Add-ons".</p>
        </div>
      ) : (
        groups.map((g, gIdx) => {
          const isSize = (g.name || '').trim().toLowerCase() === 'size';
          return (
          <div key={gIdx} className="border rounded p-3 mb-3">
            <Row className="mb-2">
              <Col md="5">
                <FormGroup className="mb-0">
                  <Label className="mb-1">Group Name</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Size, Spice Level, Add-ons"
                    value={g.name || ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const makeSize = (newName || '').trim().toLowerCase() === 'size';
                      updateGroup(gIdx, {
                        name: newName,
                        // Force single selection if group is Size
                        ...(makeSize ? { selectionType: 'single' } : {}),
                      });
                    }}
                  />
                </FormGroup>
              </Col>
              <Col md="5">
                <FormGroup className="mb-0">
                  <Label className="mb-1">Selection</Label>
                  <Input
                    type="select"
                    value={isSize ? 'single' : (g.selectionType || 'single')}
                    onChange={(e) => updateGroup(gIdx, { selectionType: e.target.value })}
                    disabled={isSize}
                  >
                    <option value="single">Single</option>
                    <option value="multiple">Multiple</option>
                  </Input>
                  {/* {isSize ? (
                    <small className="text-muted d-block mt-1">Size is always a single choice.</small>
                  ) : (
                    <small className="text-muted d-block mt-1">Single = one choice; Multiple = many choices.</small>
                  )} */}
                </FormGroup>
              </Col>
              <Col md="2" className="d-flex align-items-end">
                <Button color="danger" size="sm" onClick={() => removeGroup(gIdx)}>
                  <i className="fas fa-trash"></i>
                </Button>
              </Col>
            </Row>

            {(g.options || []).map((o, oIdx) => (
              <Row key={oIdx} className="mb-2">
                <Col md="5">
                  <Input
                    type="text"
                    placeholder="Option name"
                    value={o.name || ''}
                    onChange={(e) => updateOption(gIdx, oIdx, { name: e.target.value })}
                  />
                </Col>
                {isSize ? (
                  <Col md="6">
                    <InputGroup>
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>{currencySymbol}</InputGroupText>
                      </InputGroupAddon>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price for this size"
                        value={o.price ?? ''}
                        onChange={(e) => updateOption(gIdx, oIdx, { price: e.target.value, priceDelta: 0 })}
                      />
                    </InputGroup>
                  </Col>
                ) : (
                  <Col md="5">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Extra cost (+/-)"
                      value={o.priceDelta ?? 0}
                      onChange={(e) => updateOption(gIdx, oIdx, { priceDelta: e.target.value, price: undefined })}
                    />
                  </Col>
                )}
                <Col md="1" className="d-flex align-items-center">
                  <Button color="danger" size="sm" onClick={() => removeOption(gIdx, oIdx)}>
                    <i className="fas fa-minus-circle"></i>
                  </Button>
                </Col>
              </Row>
            ))}

            <Button color="secondary" size="sm" onClick={() => addOption(gIdx)}>
              <i className="fas fa-plus mr-1"></i> Add Option
            </Button>

            {isSize ? (
              <small className="text-muted d-block mt-2">
                Customers pick one size. Enter the full price for each size.
              </small>
            ) : (
              <small className="text-muted d-block mt-2">
                Use extra cost for add-ons. Positive adds to the price; negative gives a discount.
              </small>
            )}
          </div>
          );
        })
      )}
    </div>
  );
}
