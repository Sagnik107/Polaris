const counters = {};

const generateId = (prefix) => {
  if (!counters[prefix]) counters[prefix] = 0;
  counters[prefix]++;
  return `${prefix}-${String(counters[prefix]).padStart(4, '0')}`;
};

const generateExpeditionCode = async (Expedition) => {
  const count = await Expedition.countDocuments();
  return `EXP-2026-${String(count + 1).padStart(2, '0')}`;
};

const generateCargoCode = async (Cargo) => {
  const count = await Cargo.countDocuments();
  return `CGO-${String(count + 1).padStart(4, '0')}`;
};

const generateIncidentCode = async (Incident) => {
  const count = await Incident.countDocuments();
  return `INC-${String(count + 1).padStart(4, '0')}`;
};

const generateAssetCode = async (Asset) => {
  const count = await Asset.countDocuments();
  return `AST-${String(count + 1).padStart(4, '0')}`;
};

const generateParticipantId = async (Personnel) => {
  const count = await Personnel.countDocuments();
  return `PRS-${String(count + 1).padStart(4, '0')}`;
};

module.exports = {
  generateId,
  generateExpeditionCode,
  generateCargoCode,
  generateIncidentCode,
  generateAssetCode,
  generateParticipantId,
};
