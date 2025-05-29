import React, { useContext } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody
} from "reactstrap";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const SessionTimeoutModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Listen for session timeout events
  React.useEffect(() => {
    const handleSessionTimeout = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('sessionTimeout', handleSessionTimeout);
    
    return () => {
      window.removeEventListener('sessionTimeout', handleSessionTimeout);
    };
  }, []);
  
  const handleLogout = async () => {
    await logout(navigate);
  };
  
  return (
    <Modal isOpen={isOpen} toggle={() => setIsOpen(false)} size="sm">
      <ModalHeader toggle={() => setIsOpen(false)} className="bg-gradient-danger text-white">
        <div>
          <h4 className="mb-0 text-white font-weight-bold">
            <i className="fas fa-clock mr-2"></i>Session Timeout
          </h4>
        </div>
      </ModalHeader>
      <ModalBody className="pt-4 pb-5">
        <div className="text-center py-3">
          <div className="icon icon-shape icon-shape-danger rounded-circle mb-3">
            <i className="fas fa-exclamation-triangle fa-2x"></i>
          </div>
          <h4>Your session has expired</h4>
          <p className="text-muted">
            Due to inactivity, your session has expired. Please log in again to continue.
          </p>
          <Button color="danger" onClick={handleLogout} className="mt-3">
            <i className="fas fa-sign-out-alt mr-2"></i>Log In Again
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default SessionTimeoutModal;