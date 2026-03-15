import {
  calculateNewCoordinates,
  getHashElementInGameUrl,
  shuffleArray,
  getRandomElement,
  getDistanceBetweenKeyframes,
  getFloatValue
} from '../games/utils.js';

describe('Math and Helper Utils', () => {

  test('calculateNewCoordinates correctly rotates a point 90 degrees around origin', () => {
    const p1 = calculateNewCoordinates(10, 0, 0, 0, 90);
    // Since cos(90) = 0, sin(90) = 1
    expect(p1.x).toBeCloseTo(0);
    expect(p1.y).toBeCloseTo(10);
  });

  test('calculateNewCoordinates horizontally flips on 180 degrees', () => {
    const p1 = calculateNewCoordinates(10, 5, 0, 0, 180);
    expect(p1.x).toBeCloseTo(-10);
    expect(p1.y).toBeCloseTo(-5);
  });

  test('getHashElementInGameUrl extracts last URL part correctly', () => {
    expect(getHashElementInGameUrl('http://example.com/games/xyz123')).toBe('xyz123');
    expect(getHashElementInGameUrl('just_a_string')).toBe('just_a_string');
    expect(getHashElementInGameUrl('some/path/with/slash/')).toBe('');
  });

  test('shuffleArray returns array with same dimensions and elements', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    const shuffled = shuffleArray(copy);
    
    expect(shuffled.length).toBe(original.length);
    // Elements should be conserved
    original.forEach(n => {
        expect(shuffled.includes(n)).toBeTruthy();
    });
  });

  test('getRandomElement produces valid output from the valid options', () => {
    const items = ['apple', 'pear', 'banana', 'orange'];
    const chosen = getRandomElement(items);
    
    expect(items.includes(chosen)).toBeTruthy();
  });

  test('getDistanceBetweenKeyframes calculates correct distance from standard translate strings', () => {
    const tA = 'translate(10, 0)';
    const tB = 'translate(0, 0)';
    expect(getDistanceBetweenKeyframes(tA, tB)).toBeCloseTo(10);

    const tC = 'translate(3.0, 4.0)';
    const tD = 'translate(0, 0)';
    expect(getDistanceBetweenKeyframes(tC, tD)).toBeCloseTo(5); // 3-4-5 triangle
  });

  test('getDistanceBetweenKeyframes returns 0 on empty strings, and NaN on mismatched forms', () => {
    expect(getDistanceBetweenKeyframes('invalid', 'junk')).toBe(0);
    expect(getDistanceBetweenKeyframes('', '')).toBe(0);
    expect(getDistanceBetweenKeyframes('translate(10)', 'translate(5, 5)')).toBeNaN();
  });

  test('getFloatValue guarantees standard numeric output', () => {
    expect(getFloatValue(14.5)).toBe(14.5);
    expect(getFloatValue(-5)).toBe(-5);
    expect(getFloatValue('14.5')).toBe(0);
    expect(getFloatValue(null)).toBe(0);
    expect(getFloatValue(undefined)).toBe(0);
  });

});
