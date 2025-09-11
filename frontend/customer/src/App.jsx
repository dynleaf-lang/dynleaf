import React, { useEffect } from "react";
import OrderEaseApp from "./components/layout/OrderEaseApp";
import RestaurantProvider from "./context/RestaurantContext";
import CartProvider from "./context/CartContext";
import ResponsiveProvider from "./context/ResponsiveContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { TaxProvider } from "./context/TaxContext";
import AuthProvider, { useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import NetworkErrorHandler from "./components/Utils/NetworkErrorHandler.new";
import ConnectionStatusModal from "./components/Utils/ConnectionStatusModal";
import ServerStatusCheck from "./components/Utils/ServerStatusCheck"; 
import SessionTimeoutManager from "./components/Utils/SessionTimeoutManager"; // Auto-logout after 1 hour of inactivity
import CartAnimationEffect from "./components/ui/CartAnimationEffect";
import NotificationToast from "./components/ui/NotificationToast";
import './App.css';

// Bootstrap component to auto-consume magic token from URL and clean it up
const MagicTokenBootstrap = () => {
	const { loginWithMagicToken } = useAuth();

	useEffect(() => {
		try {
			const url = new URL(window.location.href);
			const token = url.searchParams.get('token');
			if (token) {
				// Attempt login; do not block UI
				console.log('[MagicTokenBootstrap] Found token param; attempting magic login');
				loginWithMagicToken(token)
					.then((res) => {
						console.log('[MagicTokenBootstrap] Magic login result:', res);
						// On success, remove token param from URL without reloading
						try {
							url.searchParams.delete('token');
							window.history.replaceState({}, document.title, url.pathname + (url.search ? `?${url.searchParams.toString()}` : '') + url.hash);
						} catch (_) {}
					})
					.catch((err) => {
						console.error('[MagicTokenBootstrap] Magic login failed:', err);
						// Keep token in URL for troubleshooting
					});
			}
		} catch (e) {
			// no-op
		}
	}, [loginWithMagicToken]);

	return null;
};

const App = () => {
	// Handle session expiration globally
	useEffect(() => {
		const handleSessionExpired = (event) => {
			const { reason, message } = event.detail || {};
			
			console.log('[APP] Session expired:', { reason, message });
			
			// Clear any remaining sensitive data from localStorage
			try {
				const sensitiveKeys = [
					'cart',
					'currentOrder',
					'lastOrderHash',
					'lastOrderTime',
					'lastLoginTime',
					'orderHistory',
					'userPreferences'
				];
				
				sensitiveKeys.forEach(key => {
					localStorage.removeItem(key);
				});
				
				console.log('[APP] Sensitive localStorage data cleared');
			} catch (error) {
				console.warn('[APP] Error clearing localStorage on session expiration:', error);
			}
			
			// Navigate away from protected pages
			const currentPath = window.location.pathname;
			const protectedPaths = ['/orders', '/profile', '/notifications', '/account', '/checkout'];
			
			if (protectedPaths.some(path => currentPath.includes(path))) {
				// Redirect away from protected pages
				console.log('[APP] Redirecting from protected page:', currentPath);
				window.location.href = '/';
			}
			
			// Force a small delay to ensure all context cleanups are complete
			setTimeout(() => {
				console.log('[APP] Session cleanup completed');
			}, 200);
		};

		// Add global event listener for session expiration
		window.addEventListener('session-expired', handleSessionExpired);

		// Cleanup listener on unmount
		return () => {
			window.removeEventListener('session-expired', handleSessionExpired);
		};
	}, []);

	return (
		<div className="oe-theme-liquid">
			<ResponsiveProvider>
				<RestaurantProvider>
					<CurrencyProvider>
						<TaxProvider>
							<AuthProvider>
								<FavoritesProvider>
									<SocketProvider>
										<NotificationProvider>
											<CartProvider>
												<ServerStatusCheck />
												{/* Consume WhatsApp/direct magic token on load */}
												<MagicTokenBootstrap />
												<ConnectionStatusModal />
												<NetworkErrorHandler />
												<SessionTimeoutManager />
												<OrderEaseApp />
												<CartAnimationEffect />
												<NotificationToast />
											</CartProvider>
										</NotificationProvider>
									</SocketProvider>
								</FavoritesProvider>
							</AuthProvider>
						</TaxProvider>
					</CurrencyProvider>
				</RestaurantProvider>
			</ResponsiveProvider>
		</div>
	);
};
 
export default App;
