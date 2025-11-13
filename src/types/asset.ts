// Asset types and interfaces

export type AssetType =
'ring_main_unit' |
'protection_ct' |
'emergency_stop' |      
'earth_vault_indicator' |
'efi_ct' |
'lv_cabinet' |
'lv_acb' |
'metering_cts' |
'rtu' |
'rmu' |
'CT' |
'protection_relay' |
'hv_metering_unit' |
'metering_vt' |
'lv_metering_cts' |
'battery_charger' |
'other';

export interface Asset {
  id: string;
  job_id: string;
  tenant_id: string;
  asset_type: AssetType;
  make?: string;
  model?: string;
  serial_number?: string;
  year?: number;
  location?: string;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Asset type configurations for form fields
export interface AssetTypeConfig {
  label: string;
  icon: string;
  properties: AssetPropertyConfig[];
}

export interface AssetPropertyConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select type
  unit?: string; // for display (e.g., "A", "kV", etc.)
}

// Asset type configurations
export const ASSET_TYPE_CONFIGS: Record<AssetType, AssetTypeConfig> = {
  ring_main_unit: {
    label: 'Ring Main Unit',
    icon: '⚡',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'RMU type'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      },
      {
        key: 'protection',
        label: 'Protection',
        type: 'text',
        placeholder: 'Protection type'
      },
      {
        key: 'time_fuse_rating_over_current',
        label: 'Time Fuse Rating Over Current',
        type: 'text',
        placeholder: 'Over current rating'
      },
      {
        key: 'time_fuse_rating_earth_fault',
        label: 'Time Fuse Rating Earth Fault',
        type: 'text',
        placeholder: 'Earth fault rating'
      }
    ]
  },
  efi_ct: {
    label: 'EFI CT',
    icon: '🔌',
    properties: [
        {
            key: 'efi_ct_make',
            label: 'EFI CT: Make',
            type: 'text',
            placeholder: 'EFI CT manufacturer'
          },
          {
            key: 'efi_ct_ratio',
            label: 'EFI CT: Ratio',
            type: 'text',
            placeholder: 'EFI CT ratio'
          },
          {
            key: 'efi_ct_class',
            label: 'EFI CT: Class',
            type: 'text',
            placeholder: 'EFI CT class'
          },
          {
            key: 'efi_ct_serial_nos_sw01',
            label: 'EFI CT: Serial No\'s: SW01',
            type: 'text',
            placeholder: 'SW01 serial'
          },
          {
            key: 'efi_ct_serial_nos_sw02',
            label: 'EFI CT: Serial No\'s: SW02',
            type: 'text',
            placeholder: 'SW02 serial'
          }
    ]
},
  earth_vault_indicator: {
    label: 'Earth Vault Indicator',
    icon: '🔌',
    properties: [
        {
            key: 'earth_vault_indicator_make',
            label: 'Earth Vault Indicator: Make',
            type: 'text',
            placeholder: 'EVI manufacturer'
          },
          {
            key: 'earth_vault_indicator_type',
            label: 'Earth Vault Indicator: Type',
            type: 'text',
            placeholder: 'EVI type'
          },
          {
            key: 'earth_vault_indicator_switch',
            label: 'Earth Vault Indicator: Switch 1 or 2',
            type: 'select',
            options: ['1', '2']
          },
          {
            key: 'earth_vault_indicator_serial_no',
            label: 'Earth Vault Indicator: Serial No.',
            type: 'text',
            placeholder: 'EVI serial number'
          },
          {
            key: 'earth_vault_indicator_year',
            label: 'Earth Vault Indicator: Year',
            type: 'number',
            placeholder: 'EVI year'
          },
      ]
    },
  protection_ct: {
    label: 'Protection CT',
    icon: '🔌',
    properties: [
        {
            key: 'protection_ct_make',
            label: 'Protection CT: Make',
            type: 'text',
            placeholder: 'CT manufacturer'
          },
          {
            key: 'protection_ct_ratio',
            label: 'Protection CT: Ratio',
            type: 'text',
            placeholder: 'CT ratio'
          },
          {
            key: 'protection_ct_class',
            label: 'Protection CT: Class',
            type: 'text',
            placeholder: 'CT class'
          },
          {
            key: 'protection_ct_serial_nos',
            label: 'Protection CT: Serial No\'s',
            type: 'text',
            placeholder: 'CT serial numbers'
          },
          {
            key: 'protection_ct_year',
            label: 'Protection CT: Year',
            type: 'number',
            placeholder: 'CT year'
          },
    ]
    },
  lv_cabinet: {
    label: 'LV Cabinet',
    icon: '🏗️',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'Cabinet type'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'busbar_rating',
        label: 'Busbar Rating',
        type: 'text',
        placeholder: 'Busbar rating'
      },
      {
        key: 'number_of_ways',
        label: 'Number of Ways',
        type: 'number',
        placeholder: 'Number of ways'
      },
      {
        key: 'mdi_ct_ratio',
        label: 'MDI CT ratio',
        type: 'text',
        placeholder: 'MDI CT ratio'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      }
    ]
  },
  lv_acb: {
    label: 'LV ACB',
    icon: '⚡',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'ACB type'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'rating_a',
        label: 'Rating:(A)',
        type: 'number',
        placeholder: 'Rating in Amperes'
      },
      {
        key: 'in',
        label: 'In',
        type: 'text',
        placeholder: 'In rating'
      },
      {
        key: 'lt',
        label: 'LT',
        type: 'text',
        placeholder: 'LT setting'
      },
      {
        key: 'st1',
        label: 'ST',
        type: 'text',
        placeholder: 'ST setting 1'
      },
      {
        key: 'st2',
        label: 'ST',
        type: 'text',
        placeholder: 'ST setting 2'
      },
      {
        key: 'inst',
        label: 'INST',
        type: 'text',
        placeholder: 'INST setting'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      },
      {
        key: 'short_circuit_rating_ka',
        label: 'Short Circuit Rating (kA)',
        type: 'number',
        placeholder: 'Short circuit rating in kA'
      }
    ]
  },
  metering_cts: {
    label: 'Metering CT\'s',
    icon: '📊',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'CT type'
      },
      {
        key: 'serial_no',
        label: 'Serial No',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'ratio',
        label: 'Ratio',
        type: 'text',
        placeholder: 'CT ratio'
      },
      {
        key: 'class',
        label: 'Class',
        type: 'text',
        placeholder: 'CT class'
      },
      {
        key: 'va',
        label: 'VA',
        type: 'number',
        placeholder: 'VA rating'
      }
    ]
  },
  rtu: {
    label: 'RTU',
    icon: '📡',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'RTU type'
      },
      {
        key: 'switch_no',
        label: 'Switch No',
        type: 'text',
        placeholder: 'Switch number'
      },
      {
        key: 'serial_no',
        label: 'Serial No',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'year_battery',
        label: 'Year/Battery',
        type: 'text',
        placeholder: 'Year and battery info'
      }
    ]
  },
  CT: {
    label: 'ct_primary_ratio',
    icon: '🔧',
    properties: [
      {
        key: 'range',
        label: 'Range',
        type: 'text',
        placeholder: 'Operating range'
      },
      {
        key: 'i_greater',
        label: 'I>',
        type: 'text',
        placeholder: 'I> setting'
      },
      {
        key: 'i_greater_curve',
        label: 'I> curve',
        type: 'text',
        placeholder: 'I> curve'
      },
      {
        key: 'tms',
        label: 'TMS',
        type: 'text',
        placeholder: 'Time Multiplier Setting'
      },
      {
        key: 'multiplier',
        label: '1 or 10 (x)',
        type: 'select',
        options: ['1', '10']
      },
      {
        key: 'dt_only',
        label: 'DT only',
        type: 'text',
        placeholder: 'Definite Time only settings'
      },
      {
        key: 'i_double_greater',
        label: 'I>>',
        type: 'text',
        placeholder: 'I>> setting'
      },
      {
        key: 't_double_greater',
        label: 't>>',
        type: 'text',
        placeholder: 't>> setting'
      },
      {
        key: 'io_greater',
        label: 'Io>',
        type: 'text',
        placeholder: 'Io> setting'
      },
      {
        key: 'io_greater_curve',
        label: 'Io> curve',
        type: 'text',
        placeholder: 'Io> curve'
      },
      {
        key: 'io_tms',
        label: 'Io> TMS',
        type: 'text',
        placeholder: 'Earth fault TMS'
      },
      {
        key: 'io_multiplier',
        label: 'Io> 1 or 10 (x)',
        type: 'select',
        options: ['1', '10']
      },
      {
        key: 'io_dt_only',
        label: 'Io> DT only',
        type: 'text',
        placeholder: 'Earth fault DT only'
      },
      {
        key: 'io_double_greater',
        label: 'Io>>',
        type: 'text',
        placeholder: 'Io>> setting'
      },
      {
        key: 'to_double_greater',
        label: 'to>>',
        type: 'text',
        placeholder: 'to>> setting'
      }
    ]
  },
  hv_metering_unit: {
    label: 'HV Metering Unit',
    icon: '📏',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'Unit type'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      }
    ]
  },
  metering_vt: {
    label: 'Metering VT',
    icon: '⚡',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'VT type'
      },
      {
        key: 'ratio_kv_v',
        label: 'Ratio:(kV/V)',
        type: 'text',
        placeholder: 'Ratio in kV/V'
      },
      {
        key: 'class',
        label: 'Class',
        type: 'text',
        placeholder: 'VT class'
      },
      {
        key: 'va',
        label: 'VA',
        type: 'number',
        placeholder: 'VA rating'
      },
      {
        key: 'serial_no_l1',
        label: 'Serial No: L1',
        type: 'text',
        placeholder: 'L1 serial number'
      },
      {
        key: 'serial_no_l3',
        label: 'Serial No: L3',
        type: 'text',
        placeholder: 'L3 serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      }
    ]
  },
  lv_metering_cts: {
    label: 'LV Metering CT\'s',
    icon: '📊',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'CT type'
      },
      {
        key: 'ratio',
        label: 'Ratio',
        type: 'text',
        placeholder: 'CT ratio'
      },
      {
        key: 'class',
        label: 'Class',
        type: 'text',
        placeholder: 'CT class'
      },
      {
        key: 'va',
        label: 'VA',
        type: 'number',
        placeholder: 'VA rating'
      },
      {
        key: 'serial_no_l1',
        label: 'Serial No: L1',
        type: 'text',
        placeholder: 'L1 serial number'
      },
      {
        key: 'serial_no_l2',
        label: 'Serial No: L2',
        type: 'text',
        placeholder: 'L2 serial number'
      },
      {
        key: 'serial_no_l3',
        label: 'Serial No: L3',
        type: 'text',
        placeholder: 'L3 serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      }
    ]
  },
  battery_charger: {
    label: 'Battery Charger',
    icon: '🔋',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'Charger type'
      },
      {
        key: 'serial_no',
        label: 'Serial No',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'primary_voltage',
        label: 'Primary Voltage',
        type: 'text',
        placeholder: 'Primary voltage'
      },
      {
        key: 'secondary_voltage',
        label: 'Secondary Voltage',
        type: 'text',
        placeholder: 'Secondary voltage'
      }
    ]
  },
  emergency_stop: {
    label: 'Emergency Stop',
    icon: '🚫',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'Emergency stop type'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      }
    ]
  },
  rmu: {
    label: 'RMU',
    icon: '⚡',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'RMU type'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      },
      {
        key: 'voltage_rating',
        label: 'Voltage Rating',
        type: 'text',
        placeholder: 'Voltage rating'
      },
      {
        key: 'current_rating',
        label: 'Current Rating',
        type: 'text',
        placeholder: 'Current rating'
      }
    ]
  },
  protection_relay: {
    label: 'Protection Relay',
    icon: '🔒',
    properties: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Manufacturer'
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'Relay model'
      },
      {
        key: 'serial_no',
        label: 'Serial No.',
        type: 'text',
        placeholder: 'Serial number'
      },
      {
        key: 'year',
        label: 'Year',
        type: 'number',
        placeholder: 'Year of manufacture'
      },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'Protection type'
      },
      {
        key: 'settings',
        label: 'Settings',
        type: 'textarea',
        placeholder: 'Relay settings'
      }
    ]
  },
  other: {
    label: 'Other',
    icon: '📦',
    properties: [
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe the asset...'
      }
    ]
  }
};
