import React from "react";
import OrderEaseApp from "./components/layout/OrderEaseApp";
import RestaurantProvider from "./context/RestaurantContext";
import CartProvider from "./context/CartContext";
import ResponsiveProvider from "./context/ResponsiveContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { TaxProvider } from "./context/TaxContext";
import AuthProvider from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import NetworkInfoBar from "./components/debug/NetworkInfoBar";
import NetworkErrorHandler from "./components/Utils/NetworkErrorHandler.new";
import ConnectionStatusModal from "./components/Utils/ConnectionStatusModal";
import ServerStatusCheck from "./components/Utils/ServerStatusCheck";
import NetworkStatusMonitor from "./components/Utils/NetworkStatusMonitor";
import CartAnimationEffect from "./components/ui/CartAnimationEffect";

const App = () => {
	return (
		<ResponsiveProvider>
			<RestaurantProvider>
				<CurrencyProvider>
					<TaxProvider>
						<AuthProvider>
							<SocketProvider>
								<CartProvider>
								<ServerStatusCheck />
								<ConnectionStatusModal />
								<NetworkErrorHandler />
								<OrderEaseApp />
								<CartAnimationEffect />
								<NetworkStatusMonitor />
								<NetworkInfoBar />
							</CartProvider>
							</SocketProvider>
						</AuthProvider>
					</TaxProvider>
				</CurrencyProvider>
			</RestaurantProvider>
		</ResponsiveProvider>
	);
};
 
export default App;


