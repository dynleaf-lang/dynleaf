import React, { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalHeader, Table, Spinner } from 'reactstrap';
import { InventoryAPI } from '../inventoryService';

const HistoryModal = ({ isOpen, toggle, itemId, itemName }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await InventoryAPI.history(itemId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen && itemId) fetchData(); }, [isOpen, itemId]);

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" centered>
      <ModalHeader toggle={toggle}>Adjustment History - {itemName}</ModalHeader>
      <ModalBody>
        {error && <div className="text-danger mb-2">{error}</div>}
        {loading ? (
          <div className="text-center py-4"><Spinner color="primary" /></div>
        ) : (
          <div className="table-responsive">
            <Table className="align-items-center table-flush" responsive>
              <thead className="thead-light">
                <tr>
                  <th>Date</th>
                  <th>Change</th>
                  <th>Reason</th>
                  <th>Ref</th>
                  <th>Notes</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                    <td className={r.deltaQty < 0 ? 'text-danger' : 'text-success'}>{r.deltaQty > 0 ? `+${r.deltaQty}` : r.deltaQty}</td>
                    <td>{r.reason || '-'}</td>
                    <td className="small">{r.refOrderId || '-'}</td>
                    <td className="small">{r.notes || '-'}</td>
                    <td className="small">{r.adjustedBy?.name || r.adjustedBy || '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted py-3">No history</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default HistoryModal;
