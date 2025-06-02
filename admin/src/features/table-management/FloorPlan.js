import React, { useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody,
  Button,
  ButtonGroup,
  FormGroup,
  Label,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
  Badge
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';
import { AuthContext } from '../../context/AuthContext';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';

const FloorPlan = () => {
  const { 
    tables, 
    loading, 
    error, 
    fetchTables, 
    updateTablePositions,
    floors,
    fetchFloors
  } = useContext(TableContext);
  const { user, isSuperAdmin } = useContext(AuthContext);
  
  const [selectedTable, setSelectedTable] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [floorPlanMode, setFloorPlanMode] = useState('view'); // 'view', 'edit'
  const [currentZone, setCurrentZone] = useState('Main');
  const [zones, setZones] = useState(['Main', 'Patio', 'Private']);
  const [currentFloorId, setCurrentFloorId] = useState('');
  const [changes, setChanges] = useState(false);
  const [modifiedTables, setModifiedTables] = useState([]);
  const [zoneModal, setZoneModal] = useState(false);
  const [newZone, setNewZone] = useState('');
  const [actionResult, setActionResult] = useState({
    show: false,
    type: 'success',
    message: ''
  });
  
  // Prevent frequent fetching of table data with these refs
  const initialLoadDone = useRef(false);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const fetchTablesRef = useRef(fetchTables);
  const tablesRef = useRef(tables);
  
  // Update refs when external values change
  useEffect(() => {
    fetchTablesRef.current = fetchTables;
    tablesRef.current = tables;
  }, [fetchTables, tables]);
  
  // Only run once when component mounts
  useEffect(() => {
    if (initialLoadDone.current) return;
    
    const loadInitialData = async () => {
      await fetchFloors();
      
      // For Super_Admin, fetch all tables
      // For other users, restrict to their assigned restaurant and branch
      if (isSuperAdmin && isSuperAdmin()) {
        await fetchTables();
      } else if (user) {
        const filters = {};
        if (user.restaurantId) filters.restaurantId = user.restaurantId;
        if (user.branchId) filters.branchId = user.branchId;
        await fetchTables(filters);
      }
      
      initialLoadDone.current = true;
    };
    
    loadInitialData();
    
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
  }, []); // Empty dependency array to run only once
  
  // Set default floor when floors are loaded using useMemo to prevent recalculations
  useEffect(() => {
    if (floors && floors.length > 0 && !currentFloorId) {
      setCurrentFloorId(floors[0]._id);
    }
  }, [floors, currentFloorId]);
  
  // Reset modified tables when floorPlanMode changes to view
  useEffect(() => {
    if (floorPlanMode === 'view') {
      setModifiedTables([]);
    }
  }, [floorPlanMode]);
  
  // Get current floor object with useMemo to prevent recalculations on every render
  const currentFloor = useMemo(() => {
    return (floors && floors.length > 0) ? 
      floors.find(f => f._id === currentFloorId) || {} : {};
  }, [floors, currentFloorId]);

  // Extract unique zones from tables on the current floor using useCallback
  // This is a major source of the infinite loop
  const extractZonesFromTables = useCallback(() => {
    if (!tablesRef.current || !Array.isArray(tablesRef.current) || !currentFloorId) {
      return null;
    }
    
    const uniqueZones = [...new Set(
      tablesRef.current
        .filter(table => {
          if (!table.location) return false;
          
          // Handle both string IDs and object references
          const tableFloorId = typeof table.location.floor === 'object' 
            ? table.location.floor._id 
            : table.location.floor;
          
          return tableFloorId === currentFloorId;
        })
        .map(table => table?.location?.zone)
        .filter(Boolean)
    )];
    
    return uniqueZones.length > 0 ? uniqueZones : null;
  }, [currentFloorId]);
  
  // Update zones only when needed
  useEffect(() => {
    const uniqueZones = extractZonesFromTables();
    
    // Only update state if we have new zones
    if (uniqueZones) {
      setZones(uniqueZones);
      
      // Only update currentZone if it's not in the list
      if (!uniqueZones.includes(currentZone)) {
        setCurrentZone(uniqueZones[0]);
      }
    } else if (zones.length === 0) {
      // Fallback to default zones only if zones array is empty
      setZones(['Main', 'Patio', 'Private']);
    }
  }, [extractZonesFromTables]);
  
  // Filter tables by floor and zone using useMemo to prevent recalculation on every render
  const filteredTables = useMemo(() => {
    if (!tables || !Array.isArray(tables)) return [];
    
    return tables
      .map(table => {
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
      })
      .filter(table => {
        if (!table?.location) return false;
        
        // Match by zone
        const matchesZone = table.location.zone === currentZone;
        
        // Match by floor - handling both string and object IDs
        let matchesFloor = false;
        if (typeof table.location.floor === 'object' && table.location.floor) {
          matchesFloor = table.location.floor._id === currentFloorId;
        } else {
          matchesFloor = table.location.floor === currentFloorId;
        }
        
        return matchesZone && matchesFloor;
      });
  }, [tables, modifiedTables, currentZone, currentFloorId]);

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
            floor: currentFloorId, // Ensure floor information is saved
            zone: currentZone,
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
    if (!changes || modifiedTables.length === 0) return;
    
    // Only save tables that have actually been modified
    const tablePositions = filteredTables
      .filter(table => modifiedTables.some(mt => mt._id === table._id))
      .map(table => ({
        _id: table._id,
        location: {
          ...table.location,
          floor: currentFloorId, // Ensure floor information is included
          zone: currentZone
        }
      }));
    
    try {
      const result = await updateTablePositions(tablePositions);
      if (result.success) {
        setActionResult({
          show: true,
          type: 'success',
          message: 'Table layout saved successfully'
        });
        
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
      setActionResult({
        show: true,
        type: 'danger',
        message: error.message || 'Failed to save table layout changes'
      });
    }
  };

  const handleZoneChange = (e) => {
    setCurrentZone(e.target.value);
    setSelectedTable(null); // Clear selected table when zone changes
  };

  const handleFloorChange = (e) => {
    setCurrentFloorId(e.target.value);
    setSelectedTable(null); // Clear selected table when floor changes
  };
  
  const toggleZoneModal = () => {
    setZoneModal(!zoneModal);
    setNewZone('');
  };
  
  const handleAddZone = () => {
    if (newZone.trim()) {
      // Add zone to local state
      if (!zones.includes(newZone.trim())) {
        setZones(prev => [...prev, newZone.trim()]);
        setCurrentZone(newZone.trim());
        toggleZoneModal();
      } else {
        // Show error that zone already exists
        setActionResult({
          show: true,
          type: 'warning',
          message: `Zone '${newZone.trim()}' already exists`
        });
      }
    }
  };

  const getTableColor = (table) => {
    if (selectedTable?._id === table._id) {
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
  
  // Memoize the table rendering function to prevent unnecessary recalculations
  const renderTable = useCallback((table) => {
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
  }, [floorPlanMode, getTableColor, handleDragEnd]);

  return (
    <Card className="shadow mb-4">
      <CardHeader className="py-3 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0 font-weight-bold text-primary">
            <i className="fas fa-th-large mr-2"></i>Floor Plan
          </h3>
          <p className="mb-0 small">
            <i className="fas fa-building mr-1"></i>Current floor: {currentFloor.name || 'No floor selected'} | 
            <i className="fas fa-map-marker-alt ml-2 mr-1"></i>Zone: {currentZone}
          </p>
        </div>
        <div className="d-flex align-items-center">
          <FormGroup className="mb-0 mr-3 rounded px-2 py-1">
            <Label for="floorSelect" className="mr-2 mb-0 text-dark">
              <i className="fas fa-building mr-1"></i>Floor:
            </Label>
            <Input
              type="select"
              id="floorSelect"
              value={currentFloorId}
              onChange={handleFloorChange}
              style={{ width: '150px' }}
              className="d-inline-block bg-transparent"
              disabled={floorPlanMode === 'edit' && changes}
            >
              {floors && floors.length === 0 ? (
                <option value="">No floors available</option>
              ) : (
                (floors || [])
                  .sort((a, b) => a.level - b.level)
                  .map(floor => (
                    <option key={floor._id} value={floor._id}>
                      {floor.name}
                    </option>
                  ))
                )
              } 

            </Input>
          </FormGroup>
          
          <FormGroup className="mb-0 mr-3 rounded px-2 py-1 d-flex align-items-center">
            <Label for="zoneSelect" className="mr-2 mb-0 text-dark">
              <i className="fas fa-layer-group mr-1"></i>Zone:
            </Label>
            <Input
              type="select"
              id="zoneSelect"
              value={currentZone}
              onChange={handleZoneChange}
              style={{ width: '120px' }}
              className="d-inline-block bg-transparent mr-2"
              disabled={floorPlanMode === 'edit' && changes}
            >
              {(zones || []).map(zone => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Input>
            
            <Button 
              size="sm" 
              color="secondary" 
              className="rounded" 
              title="Add New Zone"
              onClick={toggleZoneModal}
              disabled={floorPlanMode === 'edit' && changes}
            >
              <i className="fas fa-plus"></i>
            </Button>
          </FormGroup>
          
          <ButtonGroup>
            {floorPlanMode === 'view' ? (
              <Button 
                color="primary" 
                onClick={() => setFloorPlanMode('edit')}
                className="font-weight-bold"
                disabled={!floors || floors.length === 0}
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
                  color="secondary" 
                  onClick={() => {
                    setFloorPlanMode('view');
                    fetchTablesRef.current(); // Use ref to avoid re-renders
                    setChanges(false);
                    setModifiedTables([]);
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
      <CardBody ref={containerRef} className='d-flex flex-column'>
        {actionResult.show && (
          <Alert color={actionResult.type} toggle={() => setActionResult({ ...actionResult, show: false })}>
            {actionResult.message}
          </Alert>
        )}
        
        {floors.length === 0 ? (
          <div className="text-center my-5">
            <i className="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
            <h5>No floors available</h5>
            <p className="text-muted">Please create at least one floor to manage table layouts.</p>
            <p>Go to Floor Management to create your first floor.</p>
          </div>
        ) : loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center my-5">
            <p className="text-muted">No tables available on {currentFloor.name} in {currentZone} zone.</p>
            <Badge color="info" className="p-2">
              <i className="fas fa-info-circle mr-2"></i>
              You can add tables to this floor by creating them with this floor and zone selected
            </Badge>
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
                
                {/* Floor and zone label */}
                <Text
                  text={`${currentFloor.name} - ${currentZone} Zone`}
                  fontSize={18}
                  fontStyle="bold"
                  fill="#666"
                  x={20}
                  y={20}
                />
                
                {/* Render tables */}
                {filteredTables.map(renderTable)}
              </Layer>
            </Stage>
          </div>
        )}
        
        {selectedTable && (
          <div className="bg-gradient-secondary border mt-3 p-3 rounded selected-table-info">
            <h5>
              Selected Table: {selectedTable.tableId} 
              {selectedTable.isVIP && 
                <Badge color="warning" className="ml-2 px-2">VIP</Badge>
              }
            </h5>
            <div className="table-details-grid">
              <div>
                <p><strong>Name:</strong> {selectedTable.TableName}</p>
                <p><strong>Floor:</strong> {floors.find(f => {
                  // Check if floor is an object or string ID
                  if (typeof selectedTable.location?.floor === 'object') {
                    return f._id === selectedTable.location?.floor._id;
                  }
                  return f._id === selectedTable.location?.floor;
                })?.name || 'Not assigned'}</p>
                <p><strong>Zone:</strong> {selectedTable.location?.zone}</p>
              </div>
              <div>
                <p><strong>Capacity:</strong> {selectedTable.capacity} persons</p>
                <p><strong>Status:</strong> <span className="font-weight-bold">{selectedTable.status}</span></p>
              </div>
              <div>
                <p><strong>Shape:</strong> {selectedTable.shape || 'square'}</p>
                {selectedTable.currentOrder && (
                  <p><strong>Current Order:</strong> #{typeof selectedTable.currentOrder === 'object' ? 
                    selectedTable.currentOrder.orderNumber : selectedTable.currentOrder}</p>
                )}
              </div>
            </div>
            <Button size="sm" color="secondary" onClick={() => setSelectedTable(null)}>
              <i className="fas fa-times mr-1"></i> Close
            </Button>
          </div>
        )}
        
        {floorPlanMode === 'edit' && (
          <div className="bg-yellow border edit-instructions mt-3 p-3 rounded">
            <h5><i className="fas fa-info-circle mr-2"></i> Layout Edit Mode</h5>
            <p className='m-0'>Drag tables to reposition them. Click Save when finished to apply changes.</p>
          </div>
        )}
      </CardBody>
      
      {/* Add Zone Modal */}
      <Modal isOpen={zoneModal} toggle={toggleZoneModal}>
        <ModalHeader toggle={toggleZoneModal}>Add New Zone</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="newZone">Zone Name</Label>
            <Input 
              type="text" 
              id="newZone" 
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="Enter zone name"
            />
            <small className="form-text text-muted">
              Examples: Main, Patio, Private, Bar, Lounge, etc.
            </small>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleZoneModal}>Cancel</Button>
          <Button color="primary" onClick={handleAddZone} disabled={!newZone.trim()}>
            Add Zone
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default FloorPlan;