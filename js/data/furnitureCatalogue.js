/**
 * FurnishView — Furniture Catalogue
 *
 * Defines available furniture types with default dimensions, colours, display info,
 * pricing, categories, and descriptions for the catalogue browser.
 * All dimensions are in meters. Prices are in USD ($).
 *
 * @file js/data/furnitureCatalogue.js
 * @module data/furnitureCatalogue
 */

/**
 * Furniture type definitions
 * Each type includes: type ID, display label, default dimensions (meters),
 * default colour, icon key, price, category, and description
 */
export const furnitureCatalogue = [
    {
        type: 'chair',
        label: 'Dining Chair',
        sku: 'FV-CHR-001',
        defaultWidth: 0.5,
        defaultDepth: 0.5,
        defaultHeight: 0.85,
        defaultColour: '#C19A6B',
        icon: 'chair',
        price: 149,
        category: 'dining',
        description: 'Classic wooden dining chair with contoured backrest and sturdy frame.',
        stock: 24,
        materials: 'Solid Oak, Polyester Fabric',
        dimensions: 'W50 × D50 × H85 cm',
        weight: '8.5 kg',
        colours: [
            { name: 'Natural Oak', hex: '#C19A6B' },
            { name: 'Walnut', hex: '#5C3A1E' },
            { name: 'White Ash', hex: '#E8DED0' },
            { name: 'Charcoal', hex: '#4A4A4A' }
        ],
        leadTime: '3-5 business days',
        rating: 4.6,
        reviewCount: 184
    },
    {
        type: 'desk-chair',
        label: 'Desk Chair',
        sku: 'FV-DCH-001',
        defaultWidth: 0.6,
        defaultDepth: 0.6,
        defaultHeight: 1.05,
        defaultColour: '#3A3A3A',
        icon: 'desk-chair',
        price: 289,
        category: 'office',
        description: 'Ergonomic tall-back desk chair with lumbar support, pairs perfectly with desks and tables.',
        stock: 18,
        materials: 'Steel Frame, High-Density Mesh, Polyurethane Wheels',
        dimensions: 'W60 × D60 × H105 cm',
        weight: '14 kg',
        colours: [
            { name: 'Black', hex: '#3A3A3A' },
            { name: 'Grey', hex: '#6B7280' },
            { name: 'Navy', hex: '#1E3A5F' },
            { name: 'White', hex: '#E8E8E8' }
        ],
        leadTime: '3-5 business days',
        rating: 4.7,
        reviewCount: 156
    },
    {
        type: 'dining-table',
        label: 'Dining Table',
        sku: 'FV-DNG-001',
        defaultWidth: 1.6,
        defaultDepth: 0.9,
        defaultHeight: 0.75,
        defaultColour: '#A0825A',
        icon: 'table',
        price: 599,
        category: 'dining',
        description: 'Spacious solid-wood dining table seating up to six guests.',
        stock: 12,
        materials: 'Solid American Walnut, Steel Legs',
        dimensions: 'W160 × D90 × H75 cm',
        weight: '42 kg',
        colours: [
            { name: 'American Walnut', hex: '#A0825A' },
            { name: 'Natural Oak', hex: '#C8A96E' },
            { name: 'Ebony', hex: '#2D2D2D' },
            { name: 'White Oak', hex: '#E2D5C0' }
        ],
        leadTime: '1-2 weeks',
        rating: 4.7,
        reviewCount: 97
    },
    {
        type: 'side-table',
        label: 'Side Table',
        sku: 'FV-SDT-001',
        defaultWidth: 0.5,
        defaultDepth: 0.5,
        defaultHeight: 0.55,
        defaultColour: '#D4B896',
        icon: 'table-sm',
        price: 129,
        category: 'living',
        description: 'Compact side table in light wood, ideal for lamps and decorative accents.',
        stock: 38,
        materials: 'Solid Rubberwood, Lacquer Finish',
        dimensions: 'W50 × D50 × H55 cm',
        weight: '6.2 kg',
        colours: [
            { name: 'Light Birch', hex: '#D4B896' },
            { name: 'Honey Oak', hex: '#C8A05A' },
            { name: 'White', hex: '#F0EDE8' },
            { name: 'Black', hex: '#1A1A1A' }
        ],
        leadTime: '3-5 business days',
        rating: 4.3,
        reviewCount: 62
    },
    {
        type: 'sofa',
        label: 'Sofa',
        sku: 'FV-SOF-001',
        defaultWidth: 2.0,
        defaultDepth: 0.9,
        defaultHeight: 0.85,
        defaultColour: '#A8B4A5',
        icon: 'sofa',
        price: 899,
        category: 'living',
        description: 'Three-seat upholstered sofa with deep cushions and premium fabric finish.',
        stock: 8,
        materials: 'Kiln-Dried Hardwood, Premium Linen',
        dimensions: 'W200 × D90 × H85 cm',
        weight: '62 kg',
        colours: [
            { name: 'Sage Green', hex: '#A8B4A5' },
            { name: 'Warm Grey', hex: '#9E9E8E' },
            { name: 'Navy Blue', hex: '#2C3E6B' },
            { name: 'Cream', hex: '#F5ECD7' }
        ],
        leadTime: '2-4 weeks',
        rating: 4.8,
        reviewCount: 241
    },
    {
        type: 'armchair',
        label: 'Armchair',
        sku: 'FV-ARM-001',
        defaultWidth: 0.9,
        defaultDepth: 0.85,
        defaultHeight: 0.9,
        defaultColour: '#B8976A',
        icon: 'armchair',
        price: 449,
        category: 'living',
        description: 'Plush single-seat armchair with padded armrests and lumbar support.',
        stock: 19,
        materials: 'Beech Frame, High-Density Foam, Velvet Fabric',
        dimensions: 'W90 × D85 × H90 cm',
        weight: '21 kg',
        colours: [
            { name: 'Caramel', hex: '#B8976A' },
            { name: 'Dusty Rose', hex: '#C4918A' },
            { name: 'Forest Green', hex: '#4A6741' },
            { name: 'Slate Blue', hex: '#5B6B8A' }
        ],
        leadTime: '1-2 weeks',
        rating: 4.5,
        reviewCount: 130
    },
    {
        type: 'chaise',
        label: 'Chaise Lounge',
        sku: 'FV-CHS-001',
        defaultWidth: 1.8,
        defaultDepth: 0.8,
        defaultHeight: 0.75,
        defaultColour: '#6B4C7A',
        icon: 'chaise',
        price: 1099,
        category: 'living',
        description: 'Sculptural velvet chaise lounge with curved silhouette and tufted upholstery.',
        stock: 5,
        materials: 'Kiln-Dried Hardwood, Velvet Upholstery, Brass Legs',
        dimensions: 'W180 × D80 × H75 cm',
        weight: '38 kg',
        colours: [
            { name: 'Plum Velvet', hex: '#6B4C7A' },
            { name: 'Emerald', hex: '#2D6A4F' },
            { name: 'Midnight Blue', hex: '#1B3A5C' },
            { name: 'Champagne', hex: '#D4C5A9' }
        ],
        leadTime: '3-5 weeks',
        rating: 4.8,
        reviewCount: 67
    },
    {
        type: 'coffee-table',
        label: 'Coffee Table',
        sku: 'FV-CFT-001',
        defaultWidth: 1.2,
        defaultDepth: 0.6,
        defaultHeight: 0.45,
        defaultColour: '#7D5A3C',
        icon: 'coffee-table',
        price: 349,
        category: 'living',
        description: 'Low-profile dark wood coffee table with clean modern lines.',
        stock: 27,
        materials: 'Solid Mango Wood, Tempered Glass',
        dimensions: 'W120 × D60 × H45 cm',
        weight: '18 kg',
        colours: [
            { name: 'Dark Walnut', hex: '#7D5A3C' },
            { name: 'Natural Mango', hex: '#B8855A' },
            { name: 'Smoked Oak', hex: '#5A4A3A' },
            { name: 'White Marble', hex: '#EDE9E3' }
        ],
        leadTime: '3-5 business days',
        rating: 4.4,
        reviewCount: 88
    },
    {
        type: 'bookshelf',
        label: 'Bookshelf',
        sku: 'FV-BKS-001',
        defaultWidth: 0.8,
        defaultDepth: 0.3,
        defaultHeight: 1.8,
        defaultColour: '#A67B5B',
        icon: 'bookshelf',
        price: 279,
        category: 'office',
        description: 'Tall five-shelf bookcase in warm walnut, perfect for storage and display.',
        stock: 15,
        materials: 'Solid Walnut Veneer, MDF Core, Metal Brackets',
        dimensions: 'W80 × D30 × H180 cm',
        weight: '28 kg',
        colours: [
            { name: 'Warm Walnut', hex: '#A67B5B' },
            { name: 'White', hex: '#F2EFEA' },
            { name: 'Black Oak', hex: '#2A2A2A' },
            { name: 'Natural Pine', hex: '#D4B07A' }
        ],
        leadTime: '1-2 weeks',
        rating: 4.4,
        reviewCount: 113
    },
    {
        type: 'desk',
        label: 'Desk',
        sku: 'FV-DSK-001',
        defaultWidth: 1.4,
        defaultDepth: 0.7,
        defaultHeight: 0.75,
        defaultColour: '#C8AD8A',
        icon: 'desk',
        price: 399,
        category: 'office',
        description: 'Spacious writing desk with cable management and drawer storage.',
        stock: 22,
        materials: 'Solid Bamboo, Powder-Coated Steel Legs',
        dimensions: 'W140 × D70 × H75 cm',
        weight: '24 kg',
        colours: [
            { name: 'Natural Bamboo', hex: '#C8AD8A' },
            { name: 'Walnut Brown', hex: '#8B6348' },
            { name: 'White', hex: '#F0EDE8' },
            { name: 'Charcoal Oak', hex: '#3D3530' }
        ],
        leadTime: '1-2 weeks',
        rating: 4.6,
        reviewCount: 175
    },
    {
        type: 'tv-stand',
        label: 'TV Stand',
        sku: 'FV-TVS-001',
        defaultWidth: 1.5,
        defaultDepth: 0.45,
        defaultHeight: 0.55,
        defaultColour: '#6E6E6E',
        icon: 'tv-stand',
        price: 329,
        category: 'living',
        description: 'Contemporary media console with open shelving and cable routing.',
        stock: 31,
        materials: 'MDF, Oak Veneer, Powder-Coated Steel',
        dimensions: 'W150 × D45 × H55 cm',
        weight: '22 kg',
        colours: [
            { name: 'Concrete Grey', hex: '#6E6E6E' },
            { name: 'White Oak', hex: '#D8C8A8' },
            { name: 'Matte Black', hex: '#252525' },
            { name: 'Teak', hex: '#9A6B3E' }
        ],
        leadTime: '3-5 business days',
        rating: 4.2,
        reviewCount: 56
    },
    {
        type: 'bed',
        label: 'Bed',
        sku: 'FV-BED-001',
        defaultWidth: 1.6,
        defaultDepth: 2.0,
        defaultHeight: 0.5,
        defaultColour: '#EDE3D5',
        icon: 'bed',
        price: 749,
        category: 'bedroom',
        description: 'King-size platform bed with slatted headboard and solid wood frame.',
        stock: 6,
        materials: 'Solid Pine, MDF, Fabric Upholstery',
        dimensions: 'W160 × D200 × H50 cm',
        weight: '85 kg',
        colours: [
            { name: 'Ivory', hex: '#EDE3D5' },
            { name: 'Slate Grey', hex: '#6B7280' },
            { name: 'Midnight', hex: '#1F2937' },
            { name: 'Blush', hex: '#E8C4B8' }
        ],
        leadTime: '2-4 weeks',
        rating: 4.7,
        reviewCount: 212
    },
    {
        type: 'wardrobe',
        label: 'Wardrobe',
        sku: 'FV-WRD-001',
        defaultWidth: 1.8,
        defaultDepth: 0.6,
        defaultHeight: 2.0,
        defaultColour: '#C9A87C',
        icon: 'wardrobe',
        price: 699,
        category: 'bedroom',
        description: 'Double-door wardrobe with hanging rail, shelves, and soft-close hinges.',
        stock: 9,
        materials: 'Solid Oak, MDF Panels, Soft-Close Hardware',
        dimensions: 'W180 × D60 × H200 cm',
        weight: '74 kg',
        colours: [
            { name: 'Warm Oak', hex: '#C9A87C' },
            { name: 'White', hex: '#F0EDE8' },
            { name: 'Graphite', hex: '#4B4B4B' },
            { name: 'Pale Grey', hex: '#C8C8C0' }
        ],
        leadTime: '2-4 weeks',
        rating: 4.5,
        reviewCount: 148
    },
    {
        type: 'floor-plant',
        label: 'Floor Plant',
        sku: 'FV-FPL-001',
        defaultWidth: 0.45,
        defaultDepth: 0.45,
        defaultHeight: 1.2,
        defaultColour: '#2D5A27',
        icon: 'floor-plant',
        price: 89,
        category: 'decor',
        placement: 'floor',
        description: 'Tall fiddle-leaf fig in ceramic pot, adds life to any room corner.',
        stock: 30,
        materials: 'Live Plant, Glazed Ceramic Pot',
        dimensions: 'W45 × D45 × H120 cm',
        weight: '6 kg',
        colours: [
            { name: 'Forest Green', hex: '#2D5A27' },
            { name: 'Olive', hex: '#6B8E23' },
            { name: 'Dark Green', hex: '#1B3A1B' },
            { name: 'Sage', hex: '#87AE73' }
        ],
        leadTime: '3-5 business days',
        rating: 4.7,
        reviewCount: 203
    },
    {
        type: 'table-plant',
        label: 'Table Plant',
        sku: 'FV-TPL-001',
        defaultWidth: 0.2,
        defaultDepth: 0.2,
        defaultHeight: 0.3,
        defaultColour: '#3A7D44',
        icon: 'table-plant',
        price: 35,
        category: 'decor',
        placement: 'tabletop',
        description: 'Compact succulent arrangement in a minimalist ceramic planter.',
        stock: 55,
        materials: 'Live Succulents, Matte Ceramic Pot',
        dimensions: 'W20 × D20 × H30 cm',
        weight: '1.8 kg',
        colours: [
            { name: 'Green', hex: '#3A7D44' },
            { name: 'Dusty Rose', hex: '#8B6F6F' },
            { name: 'Jade', hex: '#00A86B' },
            { name: 'Aloe', hex: '#7D9B76' }
        ],
        leadTime: '3-5 business days',
        rating: 4.5,
        reviewCount: 142
    },
    {
        type: 'floor-lamp',
        label: 'Floor Lamp',
        sku: 'FV-FLM-001',
        defaultWidth: 0.35,
        defaultDepth: 0.35,
        defaultHeight: 1.6,
        defaultColour: '#2C2C2C',
        icon: 'floor-lamp',
        price: 179,
        category: 'decor',
        placement: 'floor',
        description: 'Modern arc floor lamp with fabric drum shade, warm ambient glow.',
        stock: 16,
        materials: 'Brushed Steel, Linen Shade',
        dimensions: 'W35 × D35 × H160 cm',
        weight: '7.5 kg',
        colours: [
            { name: 'Black Steel', hex: '#2C2C2C' },
            { name: 'Brushed Brass', hex: '#B8860B' },
            { name: 'Nickel', hex: '#8E8E8E' },
            { name: 'White', hex: '#E8E8E8' }
        ],
        leadTime: '3-5 business days',
        rating: 4.6,
        reviewCount: 118
    },
    {
        type: 'table-lamp',
        label: 'Table Lamp',
        sku: 'FV-TLM-001',
        defaultWidth: 0.22,
        defaultDepth: 0.22,
        defaultHeight: 0.45,
        defaultColour: '#C8A882',
        icon: 'table-lamp',
        price: 89,
        category: 'decor',
        placement: 'tabletop',
        description: 'Classic ceramic table lamp with tapered shade, ideal for desks and side tables.',
        stock: 28,
        materials: 'Glazed Ceramic Base, Cotton Shade',
        dimensions: 'W22 × D22 × H45 cm',
        weight: '2.5 kg',
        colours: [
            { name: 'Warm Beige', hex: '#C8A882' },
            { name: 'White Ceramic', hex: '#F0EDE8' },
            { name: 'Navy', hex: '#1E3A5F' },
            { name: 'Terracotta', hex: '#C4785A' }
        ],
        leadTime: '3-5 business days',
        rating: 4.4,
        reviewCount: 96
    },
    {
        type: 'bedside-lamp',
        label: 'Bedside Lamp',
        sku: 'FV-BLM-001',
        defaultWidth: 0.18,
        defaultDepth: 0.18,
        defaultHeight: 0.35,
        defaultColour: '#D4B896',
        icon: 'bedside-lamp',
        price: 69,
        category: 'decor',
        placement: 'tabletop',
        description: 'Petite bedside lamp with warm diffused light and touch-dimmer base.',
        stock: 35,
        materials: 'Wood Base, Frosted Glass Shade',
        dimensions: 'W18 × D18 × H35 cm',
        weight: '1.5 kg',
        colours: [
            { name: 'Natural Wood', hex: '#D4B896' },
            { name: 'Walnut', hex: '#5C3A1E' },
            { name: 'White Oak', hex: '#E2D5C0' },
            { name: 'Matte Black', hex: '#252525' }
        ],
        leadTime: '3-5 business days',
        rating: 4.6,
        reviewCount: 174
    },
    // ── Structure (Doors & Windows) ──────────────────────────────
    {
        type: 'single-door',
        label: 'Single Door',
        sku: 'FV-SDR-001',
        defaultWidth: 0.9,
        defaultDepth: 0.05,
        defaultHeight: 2.1,
        defaultColour: '#8B6947',
        icon: 'single-door',
        price: 249,
        category: 'structure',
        placement: 'wall',
        description: 'Classic hinged interior door with solid wood panel and brushed metal handle.',
        stock: 18,
        materials: 'Solid Pine, Brushed Nickel Handle',
        dimensions: 'W90 × D5 × H210 cm',
        weight: '18 kg',
        colours: [
            { name: 'Warm Oak', hex: '#8B6947' },
            { name: 'White', hex: '#F5F0EB' },
            { name: 'Walnut', hex: '#5C3A1E' },
            { name: 'Charcoal', hex: '#3A3A3A' }
        ],
        leadTime: '5-7 business days',
        rating: 4.5,
        reviewCount: 87
    },
    {
        type: 'double-door',
        label: 'Double Door',
        sku: 'FV-DDR-001',
        defaultWidth: 1.6,
        defaultDepth: 0.05,
        defaultHeight: 2.1,
        defaultColour: '#8B6947',
        icon: 'double-door',
        price: 449,
        category: 'structure',
        placement: 'wall',
        description: 'Wide double-panel French door with symmetrical hinges, ideal for living rooms.',
        stock: 10,
        materials: 'Solid Pine, Brushed Nickel Handles',
        dimensions: 'W160 × D5 × H210 cm',
        weight: '32 kg',
        colours: [
            { name: 'Warm Oak', hex: '#8B6947' },
            { name: 'White', hex: '#F5F0EB' },
            { name: 'Walnut', hex: '#5C3A1E' },
            { name: 'Charcoal', hex: '#3A3A3A' }
        ],
        leadTime: '5-7 business days',
        rating: 4.7,
        reviewCount: 52
    },
    {
        type: 'standard-window',
        label: 'Standard Window',
        sku: 'FV-SWN-001',
        defaultWidth: 1.2,
        defaultDepth: 0.05,
        defaultHeight: 1.0,
        defaultColour: '#E8E8E8',
        icon: 'standard-window',
        price: 199,
        category: 'structure',
        placement: 'wall',
        wallHeight: 0.9,
        description: 'Four-pane casement window with clean mullion lines and tempered glass.',
        stock: 22,
        materials: 'Aluminium Frame, Tempered Glass',
        dimensions: 'W120 × D5 × H100 cm',
        weight: '15 kg',
        colours: [
            { name: 'White Aluminium', hex: '#E8E8E8' },
            { name: 'Anthracite', hex: '#3A3A3A' },
            { name: 'Bronze', hex: '#8B7355' },
            { name: 'Black', hex: '#252525' }
        ],
        leadTime: '7-10 business days',
        rating: 4.6,
        reviewCount: 134
    },
    {
        type: 'tall-window',
        label: 'Tall Window',
        sku: 'FV-TWN-001',
        defaultWidth: 0.8,
        defaultDepth: 0.05,
        defaultHeight: 1.8,
        defaultColour: '#E8E8E8',
        icon: 'tall-window',
        price: 299,
        category: 'structure',
        placement: 'wall',
        wallHeight: 0.3,
        description: 'Elegant floor-length window with six panes, flooding rooms with natural light.',
        stock: 14,
        materials: 'Aluminium Frame, Tempered Glass',
        dimensions: 'W80 × D5 × H180 cm',
        weight: '20 kg',
        colours: [
            { name: 'White Aluminium', hex: '#E8E8E8' },
            { name: 'Anthracite', hex: '#3A3A3A' },
            { name: 'Bronze', hex: '#8B7355' },
            { name: 'Black', hex: '#252525' }
        ],
        leadTime: '7-10 business days',
        rating: 4.8,
        reviewCount: 68
    },
    {
        type: 'small-window',
        label: 'Small Window',
        sku: 'FV-SMW-001',
        defaultWidth: 0.6,
        defaultDepth: 0.05,
        defaultHeight: 0.6,
        defaultColour: '#E8E8E8',
        icon: 'small-window',
        price: 129,
        category: 'structure',
        placement: 'wall',
        wallHeight: 1.2,
        description: 'Compact single-pane window, perfect for bathrooms and utility rooms.',
        stock: 30,
        materials: 'Aluminium Frame, Tempered Glass',
        dimensions: 'W60 × D5 × H60 cm',
        weight: '8 kg',
        colours: [
            { name: 'White Aluminium', hex: '#E8E8E8' },
            { name: 'Anthracite', hex: '#3A3A3A' },
            { name: 'Bronze', hex: '#8B7355' },
            { name: 'Black', hex: '#252525' }
        ],
        leadTime: '7-10 business days',
        rating: 4.3,
        reviewCount: 91
    },
    {
        type: 'rug',
        label: 'Rug',
        sku: 'FV-RUG-001',
        defaultWidth: 2.0,
        defaultDepth: 1.5,
        defaultHeight: 0.02,
        defaultColour: '#C4785A',
        icon: 'rug',
        price: 199,
        category: 'general',
        description: 'Hand-woven area rug in rich tones, adding warmth to any room.',
        stock: 40,
        materials: '100% New Zealand Wool, Cotton Backing',
        dimensions: 'W200 × D150 × H2 cm',
        weight: '4.8 kg',
        colours: [
            { name: 'Terracotta', hex: '#C4785A' },
            { name: 'Indigo', hex: '#3B4F8A' },
            { name: 'Sand', hex: '#D8C9A8' },
            { name: 'Olive', hex: '#7A7A4A' }
        ],
        leadTime: '3-5 business days',
        rating: 4.9,
        reviewCount: 340
    }
];

/**
 * Get furniture definition by type
 * @param {string} type - Furniture type ID
 * @returns {Object|null} Furniture definition or null
 */
export function getFurnitureByType(type) {
    return furnitureCatalogue.find(f => f.type === type) || null;
}

/**
 * Get all furniture types
 * @returns {Array} Array of furniture type IDs
 */
export function getAllFurnitureTypes() {
    return furnitureCatalogue.map(f => f.type);
}

/**
 * Get furniture items filtered by category
 * @param {string} category - Category ID ('living', 'bedroom', 'dining', 'office', 'general')
 * @returns {Array} Filtered furniture items (all items if category is 'all' or invalid)
 */
export function getFurnitureByCategory(category) {
    if (!category || category === 'all') return [...furnitureCatalogue];
    return furnitureCatalogue.filter(f => f.category === category);
}

export default furnitureCatalogue;
