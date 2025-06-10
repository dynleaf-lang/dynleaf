import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  Media,
  Badge,
  Spinner
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaUtensils, FaStar } from 'react-icons/fa';
import { useCurrency } from '../../context/CurrencyContext';
import CurrencyDisplay from '../Utils/CurrencyDisplay';
import useRenderTracker from '../../utils/useRenderTracker';

const MenuItemsWidget = ({ menuItems = [], categories = [], loading = false }) => {
  useRenderTracker('MenuItemsWidget');
  
  const [popularItems, setPopularItems] = useState([]);
  
  // Use a default country code - in a real app this would come from a context or props
  const countryCode = 'DEFAULT';

  // Process menu items whenever they change
  useEffect(() => {
    if (menuItems?.length > 0) {
      // In a real app, popular items would be determined from orders data
      // For this demo, we'll just simulate it with a random popularity score
      const withPopularity = menuItems.map(item => ({
        ...item,
        popularity: Math.random() * 100
      }));
      
      const sorted = [...withPopularity].sort((a, b) => b.popularity - a.popularity);
      setPopularItems(sorted.slice(0, 5)); // Top 5 items
    }
  }, [menuItems]);
  
  // Memoize helper functions
  const getCategoryName = useCallback((categoryId) => {
    if (!categories || !categoryId) return 'Uncategorized';
    
    // Handle both string ID and object ID formats
    const category = categories.find(cat => 
      cat._id === categoryId || 
      (typeof categoryId === 'object' && cat._id === categoryId._id)
    );
    
    return category ? category.name : 'Uncategorized';
  }, [categories]);
  
  const getItemImageUrl = useCallback((item) => { 
    
    // Different possible image storage formats
    if (item.images && item.images.length > 0) {
      // Handle case where images is an array of URLs
      return item.images[0];
    } else if (item.image) {
      // Handle case where there's a single image property
      return item.image;
    } else if (item.imageUrl) {
      // Handle case where image is stored as imageUrl
      return item.imageUrl;
    } else if (item.imagePath) {
      // Handle case where image is stored as imagePath
      // If it's a relative path, prepend the backend URL
      const path = item.imagePath;
      if (path.startsWith('http')) {
        return path;
      } else {
        return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${path}`;
      }
    }
    
    return "https://cdn.pixabay.com/photo/2021/10/05/12/01/pizza-6682514_640.png"; // Default image  
  }, []);
  
  return (
    <Card className="shadow">
      <CardHeader className="border-0 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Popular Menu Items</h6>
        <Link to="/admin/menu-items">
          <Button color="primary" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-3">
            <Spinner color="primary" />
          </div>
        ) : (
          <Table size="sm" responsive hover>
            <thead className="thead-light">
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Price</th>
                <th className="text-center">Popularity</th>
              </tr>
            </thead>
            <tbody>
              {popularItems.map(item => (
                <tr key={item._id}>
                  <td>
                    <Media className="align-items-center">
                      <div className="avatar rounded mr-3">
                        <img
                          alt={item.name}
                          src={getItemImageUrl(item)}
                          className="rounded"
                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        />
                      </div>
                      <Media body>
                        <span className="font-weight-bold">{item.name}</span>
                      </Media>
                    </Media>
                  </td>
                  <td>
                    <Badge color="info" pill>
                      {getCategoryName(item.categoryId)}
                    </Badge>
                  </td>
                  <td>
                    <CurrencyDisplay amount={item.price} />
                  </td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center">
                      {[...Array(Math.min(5, Math.ceil(item.popularity / 20)))].map((_, i) => (
                        <FaStar key={i} className="text-warning" />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {popularItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-3">
                    <div className="d-flex flex-column align-items-center">
                      <FaUtensils size={24} className="text-muted mb-3" />
                      <p className="text-muted mb-0">No menu items available</p>
                      <Link to="/admin/menu-items">
                        <Button color="primary" size="sm" className="mt-2">
                          Add Menu Items
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
};

// Wrap component with React.memo to prevent unnecessary re-renders
export default memo(MenuItemsWidget);