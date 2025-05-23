import React, { useState, useEffect, useContext } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Form,
  Input,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  Badge
} from 'reactstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TableContext } from '../../context/TableContext';

const TableReservations = ({ table, onClose }) => {
  const { getTableReservations, createReservation, updateReservation, cancelReservation } = useContext(TableContext);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [currentReservation, setCurrentReservation] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date());
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: '',
    reservationDate: new Date(),
    startTime: new Date().setHours(18, 0, 0, 0), // Default to 6:00 PM
    endTime: new Date().setHours(20, 0, 0, 0),   // Default to 8:00 PM
    notes: ''
  });

  useEffect(() => {
    if (table && table._id) {
      loadReservations();
    }
  }, [table, filterDate]);

  const loadReservations = async () => {
    setLoading(true);
    const result = await getTableReservations(table._id, {
      date: filterDate.toISOString().split('T')[0]
    });
    if (result.success) {
      setReservations(result.reservations);
    }
    setLoading(false);
  };

  const toggleModal = () => {
    setModal(!modal);
    if (!modal) {
      // Reset form when opening modal
      setCurrentReservation(null);
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        partySize: '',
        reservationDate: new Date(),
        startTime: new Date().setHours(18, 0, 0, 0),
        endTime: new Date().setHours(20, 0, 0, 0),
        notes: ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'partySize' ? Number(value) : value
    });
  };

  const handleDateChange = (date, field) => {
    setFormData({
      ...formData,
      [field]: date
    });
  };

  const handleEditReservation = (reservation) => {
    setCurrentReservation(reservation);
    
    // Convert string dates to Date objects
    const reservationDate = new Date(reservation.reservationDate);
    const startTime = new Date(reservation.startTime);
    const endTime = new Date(reservation.endTime);
    
    setFormData({
      customerName: reservation.customerName || '',
      customerPhone: reservation.customerPhone || '',
      customerEmail: reservation.customerEmail || '',
      partySize: reservation.partySize || '',
      reservationDate: reservationDate,
      startTime: startTime,
      endTime: endTime,
      notes: reservation.notes || '',
      status: reservation.status
    });
    
    setModal(true);
  };

  const handleSaveReservation = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.partySize) {
      alert('Please fill in required fields: Name, Phone, and Party Size');
      return;
    }
    
    // Create formatted data object
    const reservationData = {
      ...formData,
      reservationDate: formData.reservationDate.toISOString(),
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString()
    };
    
    try {
      if (currentReservation) {
        // Update existing reservation
        await updateReservation(table._id, currentReservation._id, reservationData);
      } else {
        // Create new reservation
        await createReservation(table._id, reservationData);
      }
      
      loadReservations();
      toggleModal();
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert('Failed to save reservation. Please try again.');
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        await cancelReservation(table._id, reservationId);
        loadReservations();
      } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Failed to cancel reservation. Please try again.');
      }
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'completed':
        return 'info';
      default:
        return 'secondary';
    }
  };

  // Format time to display in a readable format
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="shadow">
      <CardHeader className="border-0 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Reservations for Table {table.tableId}</h3>
          <p className="text-muted mb-0">{table.TableName} - Capacity: {table.capacity} persons</p>
        </div>
        <div>
          <Button color="primary" size="sm" onClick={toggleModal}>
            <i className="fas fa-plus mr-2"></i> New Reservation
          </Button>
          {' '}
          <Button color="secondary" size="sm" onClick={onClose}>
            <i className="fas fa-times mr-2"></i> Close
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-3 d-flex align-items-center">
          <div className="mr-2">Filter by date:</div>
          <div style={{ width: '200px' }}>
            <DatePicker
              selected={filterDate}
              onChange={date => setFilterDate(date)}
              className="form-control"
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <Button color="info" size="sm" className="ml-2" onClick={loadReservations}>
            <i className="fas fa-filter mr-2"></i> Filter
          </Button>
        </div>

        {loading ? (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center my-3 py-4">
            <p className="text-muted">No reservations found for this date.</p>
          </div>
        ) : (
          <Table className="align-items-center table-flush" responsive>
            <thead className="thead-light">
              <tr>
                <th>Customer</th>
                <th>Party</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(reservation => (
                <tr key={reservation._id}>
                  <td>
                    <div className="font-weight-bold">{reservation.customerName}</div>
                    <div className="small text-muted">{reservation.customerPhone}</div>
                    <div className="small text-muted">{reservation.customerEmail}</div>
                  </td>
                  <td>{reservation.partySize} persons</td>
                  <td>
                    <div>{formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</div>
                    <div className="small text-muted">
                      {new Date(reservation.reservationDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <Badge color={getStatusBadgeColor(reservation.status)}>
                      {reservation.status}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      color="primary"
                      size="sm"
                      className="mr-2"
                      onClick={() => handleEditReservation(reservation)}
                      disabled={reservation.status === 'cancelled' || reservation.status === 'completed'}
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                    {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleCancelReservation(reservation._id)}
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>

      {/* Reservation Modal */}
      <Modal isOpen={modal} toggle={toggleModal} size="lg">
        <ModalHeader toggle={toggleModal}>
          {currentReservation ? 'Edit Reservation' : 'New Reservation'}
        </ModalHeader>
        <ModalBody>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <FormGroup>
                  <Label for="customerName">Customer Name*</Label>
                  <Input
                    type="text"
                    name="customerName"
                    id="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </div>
              <div className="col-md-6">
                <FormGroup>
                  <Label for="customerPhone">Phone Number*</Label>
                  <Input
                    type="text"
                    name="customerPhone"
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <FormGroup>
                  <Label for="customerEmail">Email</Label>
                  <Input
                    type="email"
                    name="customerEmail"
                    id="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                  />
                </FormGroup>
              </div>
              <div className="col-md-6">
                <FormGroup>
                  <Label for="partySize">Party Size*</Label>
                  <Input
                    type="number"
                    name="partySize"
                    id="partySize"
                    min="1"
                    max={table.capacity}
                    value={formData.partySize}
                    onChange={handleInputChange}
                    required
                  />
                  <small className="form-text text-muted">
                    Maximum capacity for this table is {table.capacity} persons
                  </small>
                </FormGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-md-4">
                <FormGroup>
                  <Label>Reservation Date*</Label>
                  <DatePicker
                    selected={formData.reservationDate}
                    onChange={date => handleDateChange(date, 'reservationDate')}
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                    minDate={new Date()}
                  />
                </FormGroup>
              </div>
              <div className="col-md-4">
                <FormGroup>
                  <Label>Start Time*</Label>
                  <DatePicker
                    selected={new Date(formData.startTime)}
                    onChange={date => handleDateChange(date, 'startTime')}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={30}
                    timeCaption="Start"
                    dateFormat="h:mm aa"
                    className="form-control"
                  />
                </FormGroup>
              </div>
              <div className="col-md-4">
                <FormGroup>
                  <Label>End Time*</Label>
                  <DatePicker
                    selected={new Date(formData.endTime)}
                    onChange={date => handleDateChange(date, 'endTime')}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={30}
                    timeCaption="End"
                    dateFormat="h:mm aa"
                    className="form-control"
                    minTime={new Date(formData.startTime)}
                    maxTime={new Date(new Date().setHours(23, 59))}
                  />
                </FormGroup>
              </div>
            </div>
            <FormGroup>
              <Label for="notes">Notes</Label>
              <Input
                type="textarea"
                name="notes"
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
              />
            </FormGroup>
            {currentReservation && (
              <FormGroup>
                <Label for="status">Status</Label>
                <Input
                  type="select"
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </Input>
              </FormGroup>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>Cancel</Button>
          <Button color="primary" onClick={handleSaveReservation}>
            {currentReservation ? 'Update Reservation' : 'Create Reservation'}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default TableReservations;