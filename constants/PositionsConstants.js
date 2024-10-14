const POSITION_HEALTH_STATUS = {
  HEALTHY: 'healthy',
  SOFT: 'Soft Liquidation',
  HARD: 'Hard Liquidation',
};

const DEFAULT_ADDRESS_OBJECT = {
  address: undefined,
  positions: [],
};

const DEFAULT_POSITION_OBJECT = {
  address: undefined,
  last_checked_state: 'HEALTHY',
};

export {
  POSITION_HEALTH_STATUS,
  DEFAULT_ADDRESS_OBJECT,
  DEFAULT_POSITION_OBJECT,
};
