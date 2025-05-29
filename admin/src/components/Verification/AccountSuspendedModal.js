import React from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody
} from "reactstrap";

const AccountSuspendedModal = ({ isOpen, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} backdrop="static" keyboard={false} size="sm">
      <ModalHeader className="bg-gradient-danger text-white">
        <div>
          <h4 className="mb-0 text-white font-weight-bold">
            <i className="fas fa-ban mr-2"></i>Account Suspended
          </h4>
        </div>
      </ModalHeader>
      <ModalBody className="pt-4 pb-5">
        <div className="text-center py-3">
          <div className="icon icon-shape icon-shape-danger rounded-circle mb-3">
            <i className="fas fa-exclamation-circle fa-2x"></i>
          </div>
          <h4>Your account has been suspended</h4>
          <p className="text-muted">
            Your account has been suspended by the administrator. Please contact support for more information.
          </p>
          <Button color="danger" onClick={onConfirm} className="mt-3">
            <i className="fas fa-sign-out-alt mr-2"></i>Log Out
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AccountSuspendedModal;