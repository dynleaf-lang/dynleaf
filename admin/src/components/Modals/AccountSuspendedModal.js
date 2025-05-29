import React from 'react';
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from 'reactstrap';

const AccountSuspendedModal = ({ isOpen, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} backdrop="static" keyboard={false} centered>
      <ModalHeader className="bg-danger text-white">
        <i className="fas fa-exclamation-triangle mr-2"></i>Account Suspended
      </ModalHeader>
      <ModalBody className="text-center p-5">
        <div className="mb-4">
          <i className="fas fa-user-lock fa-4x text-danger mb-3"></i>
          <h4 className="font-weight-bold">Your account has been suspended</h4>
          <p className="text-muted">
            Your account has been suspended by an administrator. 
            Please contact support for more information.
          </p>
        </div>
      </ModalBody>
      <ModalFooter className="justify-content-center">
        <Button color="primary" onClick={onConfirm}>
          <i className="fas fa-sign-out-alt mr-1"></i> OK
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AccountSuspendedModal;