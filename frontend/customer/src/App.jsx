import React from "react";
import OrderEaseApp from "./components/layout/OrderEaseApp";
import RestaurantProvider from "./context/RestaurantContext";
import CartProvider from "./context/CartContext";
import ResponsiveProvider from "./context/ResponsiveContext";
import NetworkInfoBar from "./components/debug/NetworkInfoBar";
import NetworkErrorHandler from "./components/Utils/NetworkErrorHandler";
import ConnectionStatusModal from "./components/Utils/ConnectionStatusModal";
import ServerStatusCheck from "./components/Utils/ServerStatusCheck";

const App = () => {
	return (
		<ResponsiveProvider>
			<RestaurantProvider>
				<CartProvider>
					<ServerStatusCheck />
					<ConnectionStatusModal />
					<NetworkErrorHandler />
					<OrderEaseApp />
					<NetworkInfoBar />
				</CartProvider>
			</RestaurantProvider>
		</ResponsiveProvider>
	);
};

export default App;
