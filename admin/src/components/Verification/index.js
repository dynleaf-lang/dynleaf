// Export all verification components and hooks from a single file
import EmailVerificationModal from './EmailVerificationModal';
import VerificationProvider from './VerificationProvider';
import VerificationBanner from './VerificationBanner';
import AccountSuspendedModal from './AccountSuspendedModal';
import SessionTimeoutModal from './SessionTimeoutModal';
import VerificationContainer from './VerificationContainer';
import useEmailVerification from './hooks/useEmailVerification';

export {
  EmailVerificationModal,
  VerificationProvider,
  VerificationBanner,
  AccountSuspendedModal,
  SessionTimeoutModal,
  VerificationContainer,
  useEmailVerification
};