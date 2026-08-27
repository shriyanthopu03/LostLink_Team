const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") => new Set(normalizeText(value).split(" ").filter(Boolean));

const similarityScore = (left = "", right = "") => {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
};

const locationScore = (left = "", right = "") => {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared ? 1 : 0;
};

const calculateMatchScore = (sourceItem, targetItem) => {
  const categoryScore = normalizeText(sourceItem.category) === normalizeText(targetItem.category) ? 1 : 0;
  const descriptionScore = similarityScore(sourceItem.description, targetItem.description);
  const titleScore = similarityScore(sourceItem.title, targetItem.title);
  const locationSimilarity = locationScore(sourceItem.location, targetItem.location);

  const dateA = new Date(sourceItem.eventDate).getTime();
  const dateB = new Date(targetItem.eventDate).getTime();
  const dayDifference = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
  const dateScore = Math.max(0, 1 - Math.min(dayDifference, 7) / 7);

  const score =
    categoryScore * 35 +
    descriptionScore * 25 +
    titleScore * 15 +
    locationSimilarity * 15 +
    dateScore * 10;

  const reasons = [];
  if (categoryScore) reasons.push("same category");
  if (descriptionScore > 0.3) reasons.push("similar description");
  if (titleScore > 0.3) reasons.push("similar title");
  if (locationSimilarity) reasons.push("nearby location");
  if (dateScore > 0.7) reasons.push("close date");

  return { score: Math.round(score), reasons };
};

export default calculateMatchScore;