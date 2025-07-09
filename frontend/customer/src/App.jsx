import React from "react";
import OrderEaseApp from "./components/layout/OrderEaseApp";
import RestaurantProvider from "./context/RestaurantContext";
import CartProvider from "./context/CartContext";
import ResponsiveProvider from "./context/ResponsiveContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { TaxProvider } from "./context/TaxContext";
import AuthProvider from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import NetworkErrorHandler from "./components/Utils/NetworkErrorHandler.new";
import ConnectionStatusModal from "./components/Utils/ConnectionStatusModal";
import ServerStatusCheck from "./components/Utils/ServerStatusCheck"; 
import CartAnimationEffect from "./components/ui/CartAnimationEffect";

const App = () => {
	return (
		<ResponsiveProvider>
			<RestaurantProvider>
				<CurrencyProvider>
					<TaxProvider>
						<AuthProvider>
							<SocketProvider>
								<NotificationProvider>
									<CartProvider>
										<ServerStatusCheck />
										<ConnectionStatusModal />
										<NetworkErrorHandler />
										<OrderEaseApp />
										<CartAnimationEffect /> 
									</CartProvider>
								</NotificationProvider>
							</SocketProvider>
						</AuthProvider>
					</TaxProvider>
				</CurrencyProvider>
			</RestaurantProvider>
		</ResponsiveProvider>
	);
};
 
export default App;


