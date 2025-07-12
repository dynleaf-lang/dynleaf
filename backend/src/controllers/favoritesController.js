const Customer = require('../models/Customer');
const MenuItem = require('../models/MenuItem');

/**
 * Add a product to customer's favorites
 */
const addToFavorites = async (req, res) => {
    try {
        const { productId } = req.body;
        const { identifier } = req.params; // Can be phone or email

        if (!productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product ID is required' 
            });
        }

        if (!identifier) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer identifier is required' 
            });
        }

        // Find customer by phone or email
        const customer = await Customer.findOne({
            $or: [
                { phone: identifier },
                { email: identifier }
            ]
        });

        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        // Check if product is already in favorites
        const existingFavorite = customer.favorites.find(
            fav => fav.productId === productId
        );

        if (existingFavorite) {
            return res.status(409).json({ 
                success: false, 
                message: 'Product already in favorites' 
            });
        }

        // Add to favorites
        customer.favorites.push({
            productId,
            addedAt: new Date()
        });

        await customer.save();

        // Product added successfully

        res.status(200).json({ 
            success: true, 
            message: 'Product added to favorites',
            favorites: customer.favorites 
        });

    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Remove a product from customer's favorites
 */
const removeFromFavorites = async (req, res) => {
    try {
        const { productId } = req.params;
        const { identifier } = req.params; // Can be phone or email

        if (!productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product ID is required' 
            });
        }

        if (!identifier) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer identifier is required' 
            });
        }

        // Find customer by phone or email
        const customer = await Customer.findOne({
            $or: [
                { phone: identifier },
                { email: identifier }
            ]
        });

        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        // Remove from favorites
        const initialLength = customer.favorites.length;
        customer.favorites = customer.favorites.filter(
            fav => fav.productId !== productId
        );

        if (customer.favorites.length === initialLength) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found in favorites' 
            });
        }

        await customer.save();

        // Product removed successfully

        res.status(200).json({ 
            success: true, 
            message: 'Product removed from favorites',
            favorites: customer.favorites 
        });

    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Get customer's favorites
 */
const getFavorites = async (req, res) => {
    try {
        const { identifier } = req.params; // Can be phone or email

        if (!identifier) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer identifier is required' 
            });
        }

        // Find customer by phone or email
        const customer = await Customer.findOne({
            $or: [
                { phone: identifier },
                { email: identifier }
            ]
        });

        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        // Get the MenuItem model to populate product data
        const MenuItem = require('../models/MenuItem');
        
        // Test if MenuItem collection exists and has data
        try {
            const menuItemCount = await MenuItem.countDocuments();
            
            if (menuItemCount === 0) {
                console.warn('No menu items found in database - this might be why favorites are empty');
            }
        } catch (menuCountError) {
            console.error('Error counting menu items:', menuCountError);
        }
        
        // Build favorites with full product data
        const favoritesWithProducts = [];
        
        for (const favorite of customer.favorites) {
            try {
                // Find the menu item by itemId or _id
                // First try by itemId (string identifier)
                let menuItem = await MenuItem.findOne({ 
                    itemId: favorite.productId 
                }).populate('categoryId');
                
                // If not found by itemId, try by MongoDB _id
                if (!menuItem) {
                    try {
                        menuItem = await MenuItem.findById(favorite.productId).populate('categoryId');
                    } catch (idError) {
                        // Invalid ObjectId format, continue to next favorite
                        continue;
                    }
                }
                
                if (menuItem) {
                    favoritesWithProducts.push({
                        id: menuItem._id,
                        itemId: menuItem.itemId,
                        name: menuItem.name,
                        description: menuItem.description,
                        price: menuItem.price,
                        imageUrl: menuItem.imageUrl,
                        isVegetarian: menuItem.isVegetarian,
                        tags: menuItem.tags,
                        featured: menuItem.featured,
                        isActive: menuItem.isActive,
                        sizeVariants: menuItem.sizeVariants,
                        category: menuItem.categoryId,
                        addedAt: favorite.addedAt,
                        productId: favorite.productId
                    });
                } else {
                    console.warn(`Menu item not found for productId: ${favorite.productId} (tried both itemId and _id)`);
                }
            } catch (itemError) {
                console.error(`Error fetching menu item ${favorite.productId}:`, itemError);
            }
        }

        res.status(200).json({ 
            success: true, 
            favorites: favoritesWithProducts 
        });

    } catch (error) {
        console.error('Error getting favorites:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Check if a product is in customer's favorites
 */
const isFavorite = async (req, res) => {
    try {
        const { identifier, productId } = req.params;

        if (!identifier || !productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer identifier and product ID are required' 
            });
        }

        // Find customer by phone or email
        const customer = await Customer.findOne({
            $or: [
                { phone: identifier },
                { email: identifier }
            ]
        });

        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        const isFav = customer.favorites.some(fav => fav.productId === productId);

        res.status(200).json({ 
            success: true, 
            isFavorite: isFav 
        });

    } catch (error) {
        console.error('Error checking favorite status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    addToFavorites,
    removeFromFavorites,
    getFavorites,
    isFavorite
};
