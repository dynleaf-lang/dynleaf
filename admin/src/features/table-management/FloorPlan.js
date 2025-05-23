import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody,
  Button,
  ButtonGroup,
  FormGroup,
  Label,
  Input
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';
import { AuthContext } from '../../context/AuthContext';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';

const FloorPlan = () => {
  const { tables, loading, fetchTables, updateTablePositions } = useContext(TableContext);
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [selectedTable, setSelectedTable] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [floorPlanMode, setFloorPlanMode] = useState('view'); // 'view', 'edit'
  const [currentZone, setCurrentZone] = useState('Main');
  const [zones, setZones] = useState(['Main', 'Patio', 'Private']);
  const [changes, setChanges] = useState(false);
  // Create a local state to track tables with modified positions
  const [modifiedTables, setModifiedTables] = useState([]);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  
  // Use useRef to store the fetchTables function to avoid re-renders
  const fetchTablesRef = useRef(fetchTables);
  
  // Only run once when component mounts
  useEffect(() => {
    // Fetch tables when component mounts - only for the user's assigned restaurant and branch
    if (user) {
      // If user is SuperAdmin, fetch all tables (or they can be filtered by selected restaurant/branch elsewhere)
      // For other users, fetch only tables for their assigned restaurant and branch
      if (isSuperAdmin()) {
        fetchTablesRef.current();
      } else if (user.restaurantId && user.branchId) {
        fetchTablesRef.current({ 
          restaurantId: user.restaurantId,
          branchId: user.branchId 
        });
      }
    }
    
    // Handle window resize to adjust stage size
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setStageSize({
          width: clientWidth - 30, // Adjust for padding
          height: 600
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [user, isSuperAdmin]); 
  
  // Reset modified tables when tables data changes
  useEffect(() => {
    if (floorPlanMode === 'view') {
      setModifiedTables([]);
    }
  }, [tables, floorPlanMode]);
  
  // Filter tables by zone and apply any modifications
  const filteredTables = tables.map(table => {
    // Check if this table has modified positions
    const modified = modifiedTables.find(t => t._id === table._id);
    if (modified) {
      return {
        ...table,
        location: {
          ...table.location,
          x: modified.location.x,
          y: modified.location.y
        }
      };
    }
    return table;
  }).filter(table => table?.location?.zone === currentZone);

  const handleDragEnd = (e, tableId) => {
    if (floorPlanMode !== 'edit') return;
    
    const table = tables.find(t => t._id === tableId);
    if (!table) return;
    
    // Get the new position
    const newX = e.target.x();
    const newY = e.target.y();
    
    // Update our local modified tables state
    setModifiedTables(prev => {
      const existingIndex = prev.findIndex(t => t._id === tableId);
      
      if (existingIndex >= 0) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          location: {
            ...updated[existingIndex].location,
            x: newX,
            y: newY
          }
        };
        return updated;
      } else {
        // Add new entry
        return [...prev, {
          _id: tableId,
          location: {
            ...table.location,
            x: newX,
            y: newY
          }
        }];
      }
    });
    
    // Set changes flag to enable the Save button
    setChanges(true);
  };

  const handleSaveLayout = async () => {
    // Only save tables that have actually been modified
    const tablePositions = filteredTables
      .filter(table => modifiedTables.some(mt => mt._id === table._id))
      .map(table => ({
        _id: table._id,
        location: table.location
      }));
    
    console.log('Saving table positions:', tablePositions);
    
    try {
      const result = await updateTablePositions(tablePositions);
      if (result.success) {
        setChanges(false);
        setFloorPlanMode('view');
        setModifiedTables([]);
        
        // Refresh tables to ensure we have the latest data
        fetchTablesRef.current();
      } else {
        throw new Error(result.error || 'Failed to save table positions');
      }
    } catch (error) {
      console.error('Error saving table positions:', error);
      alert('Failed to save table layout changes.');
    }
  };

  const handleZoneChange = (e) => {
    setCurrentZone(e.target.value);
  };

  const getTableColor = (table) => {
    if (table._id === selectedTable?._id) {
      return '#3498db'; // Highlight selected table
    }
    
    switch (table.status) {
      case 'occupied':
        return '#e74c3c'; // Red for occupied
      case 'reserved':
        return '#f39c12'; // Orange for reserved
      case 'maintenance':
        return '#7f8c8d'; // Gray for maintenance
      case 'available':
      default:
        return '#2ecc71'; // Green for available
    }
  };
  
  const renderTable = (table) => {
    const { shape = 'square', size = { width: 80, height: 80 } } = table;
    const x = table.location?.x || 50;
    const y = table.location?.y || 50;
    const width = size.width || 80;
    const height = shape === 'round' ? width : (size.height || 80);
    
    if (shape === 'round') {
      return (
        <Group
          key={table._id}
          x={x}
          y={y}
          draggable={floorPlanMode === 'edit'}
          onDragEnd={(e) => handleDragEnd(e, table._id)}
          onClick={() => setSelectedTable(table)}
        >
          <Circle
            radius={width / 2}
            fill={getTableColor(table)}
            stroke="#000"
            strokeWidth={2}
          />
          <Text
            text={table.tableId}
            fontSize={16}
            fontStyle="bold"
            fill="#fff"
            width={width}
            height={height}
            align="center"
            verticalAlign="middle"
            offsetX={width / 2}
            offsetY={width / 2}
          />
          <Text
            text={`${table.capacity} p`}
            fontSize={12}
            fill="#fff"
            width={width}
            height={height}
            align="center"
            verticalAlign="middle"
            offsetX={width / 2}
            offsetY={width / 2 - 20}
          />
        </Group>
      );
    }
    
    return (
      <Group
        key={table._id}
        x={x}
        y={y}
        draggable={floorPlanMode === 'edit'}
        onDragEnd={(e) => handleDragEnd(e, table._id)}
        onClick={() => setSelectedTable(table)}
      >
        <Rect
          width={width}
          height={height}
          fill={getTableColor(table)}
          stroke="#000"
          strokeWidth={2}
          cornerRadius={shape === 'rectangle' ? 0 : 5}
        />
        <Text
          text={table.tableId}
          fontSize={16}
          fontStyle="bold"
          fill="#fff"
          width={width}
          height={height}
          align="center"
          verticalAlign="middle"
        />
        <Text
          text={`${table.capacity} p`}
          fontSize={12}
          fill="#fff"
          width={width}
          height={height}
          align="center"
          verticalAlign="middle"
          y={-20}
        />
      </Group>
    );
  };

  return (
    <Card className="shadow mb-4">
      <CardHeader className="py-3 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0 font-weight-bold">
            <i className="fas fa-th-large mr-2"></i>Floor Plan
          </h3>
          <p className="mb-0 small">
            <i className="fas fa-map-marker-alt mr-1"></i>Current zone: {currentZone}
          </p>
        </div>
        <div className="d-flex align-items-center">
          <FormGroup className="mb-0 mr-3 rounded px-2 py-1">
            <Label for="zoneSelect" className="mr-2 mb-0 text-dark">
              <i className="fas fa-layer-group mr-1"></i>Zone:
            </Label>
            <Input
              type="select"
              id="zoneSelect"
              value={currentZone}
              onChange={handleZoneChange}
              style={{ width: '120px' }}
              className="d-inline-block bg-transparent"
            >
              {zones.map(zone => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Input>
          </FormGroup>
          
          <ButtonGroup>
            {floorPlanMode === 'view' ? (
              <Button 
                color="primary" 
                onClick={() => setFloorPlanMode('edit')}
                className="font-weight-bold"
              >
                <i className="fas fa-edit mr-2"></i> Edit Layout
              </Button>
            ) : (
              <>
                <Button 
                  color="success" 
                  onClick={handleSaveLayout}
                  disabled={!changes}
                  className="font-weight-bold"
                >
                  <i className="fas fa-save mr-2"></i> Save
                </Button>
                <Button 
                  color="primary" 
                  onClick={() => {
                    setFloorPlanMode('view');
                    fetchTablesRef.current(); // Use ref to avoid re-renders
                    setChanges(false);
                  }}
                  className="font-weight-bold"
                >
                  <i className="fas fa-times mr-2"></i> Cancel
                </Button>
              </>
            )}
          </ButtonGroup>
        </div>
      </CardHeader>
      <CardBody ref={containerRef} className='d-flex'>
        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center my-5">
            <p className="text-muted">No tables available in this zone.</p>
          </div>
        ) : (
          <div className="floor-plan-container">
            <Stage 
              width={stageSize.width} 
              height={stageSize.height} 
              ref={stageRef}
            >
              <Layer>
                {/* Room outline */}
                <Rect
                  x={10}
                  y={10}
                  width={stageSize.width - 20}
                  height={stageSize.height - 20}
                  stroke="#333"
                  strokeWidth={2}
                  dash={[10, 5]}
                  fill="#f9f9f9"
                />
                
                {/* Render tables */}
                {filteredTables.map(renderTable)}
              </Layer>
            </Stage>
          </div>
        )}
        
        {selectedTable && (
          <div className="bg-gradient-secondary border h-100 ml-4 mt-2 p-3 p-5 rounded selected-table-info">
            <h5>Selected Table: {selectedTable.tableId} - {selectedTable.TableName}</h5>
            <p>Capacity: {selectedTable.capacity} persons</p>
            <p>Status: <span className="font-weight-bold">{selectedTable.status}</span></p>
            {selectedTable.currentOrder && (
              <p>Current Order: #{selectedTable.currentOrder}</p>
            )}
            <Button size="sm" color="secondary" onClick={() => setSelectedTable(null)}>
              Close
            </Button>
          </div>
        )}
        
        {floorPlanMode === 'edit' && (
          <div className="bg-yellow border edit-instructions h-100 ml-2 mt-2 p-3 rounded w-100">
            <h5><i className="fas fa-info-circle mr-2"></i> Layout Edit Mode</h5>
            <p className='m-0'>Drag tables to reposition them. Click Save when finished to apply changes.</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default FloorPlan;