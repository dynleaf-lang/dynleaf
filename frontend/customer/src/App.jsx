import React from "react";
import OrderEaseApp from "./components/layout/OrderEaseApp";
import RestaurantProvider from "./context/RestaurantContext";
import CartProvider from "./context/CartContext";
import ResponsiveProvider from "./context/ResponsiveContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { TaxProvider } from "./context/TaxContext";
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
						<CartProvider>
							<ServerStatusCheck />
							<ConnectionStatusModal />
							<NetworkErrorHandler />
							<OrderEaseApp />
							<CartAnimationEffect />
							<NetworkStatusMonitor />
							<NetworkInfoBar />
						</CartProvider>
					</TaxProvider>
				</CurrencyProvider>
			</RestaurantProvider>
		</ResponsiveProvider>
	);
};
 
export default App;


