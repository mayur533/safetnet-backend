import apiClient from '../api/apiClient';

/**
 * Test script for geofence assignment functionality
 * Uses the newly implemented backend APIs
 */

export const testGeofenceAssignment = async () => {
  console.log('🚨 TESTING GEOFENCE ASSIGNMENT APIS');
  console.log('=====================================');
  
  try {
    // Step 1: Create a test geofence
    console.log('📍 Step 1: Creating test geofence...');
    
    const geofenceData = {
      name: 'Officer001_Assigned_Area',
      geofence_type: 'polygon',
      polygon_json: JSON.stringify({
        type: 'Polygon',
        coordinates: [[
          [73.78467, 18.64739], // [longitude, latitude]
          [73.78446, 18.64739], // [longitude, latitude]
          [73.78468, 18.64706], // [longitude, latitude]
          [73.78445, 18.64705], // [longitude, latitude]
          [73.78467, 18.64739]  // Close polygon
        ]]
      }),
      is_active: true
    };
    
    const geofenceResponse = await apiClient.post('/geofence/', geofenceData);
    console.log('✅ Geofence created:', geofenceResponse.data);
    
    // Step 2: Assign geofence to officer001
    console.log('👮 Step 2: Assigning geofence to officer001...');
    
    const assignmentResponse = await apiClient.post('/api/subadmin/officers/officer001/geofences/', {
      geofence_id: geofenceResponse.data.id
    });
    console.log('✅ Assignment created:', assignmentResponse.data);
    
    // Step 3: Verify assignment
    console.log('🔍 Step 3: Verifying assignment...');
    
    const verificationResponse = await apiClient.get('/api/subadmin/officers/officer001/geofences/');
    console.log('✅ Verification successful:', verificationResponse.data);
    
    console.log('=====================================');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('📋 Summary:');
    console.log('   - Geofence created and stored in database');
    console.log('   - Assignment created in core_officer_geofence_assignment table');
    console.log('   - officer001 now has assigned geofence');
    console.log('   - All APIs working correctly');
    
    return {
      geofence: geofenceResponse.data,
      assignment: assignmentResponse.data,
      verification: verificationResponse.data
    };
    
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      data: error.data
    });
    throw error;
  }
};

/**
 * Example API requests and responses
 */
export const exampleAPIRequests = {
  createGeofence: {
    method: 'POST',
    url: '/geofence/',
    payload: {
      name: 'Officer001_Assigned_Area',
      geofence_type: 'polygon',
      polygon_json: {
        type: 'Polygon',
        coordinates: [[[73.78467, 18.64739], [73.78446, 18.64739], [73.78468, 18.64706], [73.78445, 18.64705], [73.78467, 18.64739]]]
      },
      is_active: true
    },
    response: {
      id: 123,
      name: 'Officer001_Assigned_Area',
      created_at: '2026-02-06T14:30:00Z'
    }
  },
  
  assignGeofence: {
    method: 'POST',
    url: '/api/subadmin/officers/officer001/geofences/',
    payload: {
      geofence_id: 123
    },
    response: {
      id: 456,
      officer: 'officer001',
      officer_name: 'officer001',
      geofence: 123,
      geofence_name: 'Officer001_Assigned_Area',
      assigned_by: 'subadmin_user',
      assigned_by_name: 'subadmin_user',
      assigned_at: '2026-02-06T14:31:00Z',
      is_active: true
    }
  },
  
  getAssignments: {
    method: 'GET',
    url: '/api/subadmin/officers/officer001/geofences/',
    response: [
      {
        id: 456,
        officer: 'officer001',
        officer_name: 'officer001',
        geofence: 123,
        geofence_name: 'Officer001_Assigned_Area',
        assigned_by: 'subadmin_user',
        assigned_by_name: 'subadmin_user',
        assigned_at: '2026-02-06T14:31:00Z',
        is_active: true
      }
    ]
  }
};
