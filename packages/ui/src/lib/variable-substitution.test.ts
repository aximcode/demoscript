import { describe, it, expect } from 'vitest';
import { substituteVariables, substituteInObject, extractValueByPath } from './variable-substitution';

describe('substituteVariables', () => {
  it('replaces simple variable', () => {
    const result = substituteVariables('Hello $name', { name: 'World' });
    expect(result).toBe('Hello World');
  });

  it('replaces multiple variables', () => {
    const result = substituteVariables('$greeting $name!', { greeting: 'Hello', name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('leaves unknown variables unchanged', () => {
    const result = substituteVariables('Hello $unknown', { name: 'World' });
    expect(result).toBe('Hello $unknown');
  });

  it('handles numeric values', () => {
    const result = substituteVariables('Count: $count', { count: 42 });
    expect(result).toBe('Count: 42');
  });

  it('handles null values', () => {
    const result = substituteVariables('Value: $val', { val: null });
    expect(result).toBe('Value: ');
  });

  it('handles underscore in variable names', () => {
    const result = substituteVariables('$my_var', { my_var: 'test' });
    expect(result).toBe('test');
  });
});

describe('substituteInObject', () => {
  it('substitutes in nested objects', () => {
    const obj = { url: '/api/$id', data: { name: '$name' } };
    const result = substituteInObject(obj, { id: '123', name: 'Test' });
    expect(result).toEqual({ url: '/api/123', data: { name: 'Test' } });
  });

  it('substitutes in arrays', () => {
    const arr = ['$first', '$second'];
    const result = substituteInObject(arr, { first: 'A', second: 'B' });
    expect(result).toEqual(['A', 'B']);
  });

  it('preserves non-string values', () => {
    const obj = { num: 42, bool: true, str: '$var' };
    const result = substituteInObject(obj, { var: 'replaced' });
    expect(result).toEqual({ num: 42, bool: true, str: 'replaced' });
  });
});

describe('extractValueByPath', () => {
  it('extracts simple property', () => {
    const result = extractValueByPath({ name: 'test' }, 'name');
    expect(result).toBe('test');
  });

  it('extracts nested property', () => {
    const obj = { data: { user: { id: 123 } } };
    const result = extractValueByPath(obj, 'data.user.id');
    expect(result).toBe(123);
  });

  it('returns undefined for missing path', () => {
    const result = extractValueByPath({ name: 'test' }, 'missing.path');
    expect(result).toBeUndefined();
  });

  it('handles null in path', () => {
    const obj = { data: null };
    const result = extractValueByPath(obj, 'data.name');
    expect(result).toBeUndefined();
  });

  it('extracts array element with dot notation', () => {
    const obj = { items: ['a', 'b', 'c'] };
    const result = extractValueByPath(obj, 'items.1');
    expect(result).toBe('b');
  });

  it('extracts array element with bracket notation', () => {
    const obj = { items: ['a', 'b', 'c'] };
    const result = extractValueByPath(obj, 'items[1]');
    expect(result).toBe('b');
  });

  it('extracts first element of root array with bracket notation', () => {
    const arr = [{ id: 123, name: 'first' }, { id: 456, name: 'second' }];
    const result = extractValueByPath(arr, '[0].id');
    expect(result).toBe(123);
  });

  it('extracts nested property from array element', () => {
    const arr = [{ id: 123, name: 'first' }, { id: 456, name: 'second' }];
    const result = extractValueByPath(arr, '[1].name');
    expect(result).toBe('second');
  });

  it('handles mixed bracket and dot notation', () => {
    const obj = { data: [{ users: [{ name: 'Alice' }, { name: 'Bob' }] }] };
    const result = extractValueByPath(obj, 'data[0].users[1].name');
    expect(result).toBe('Bob');
  });

  it('returns undefined for out of bounds array index', () => {
    const arr = [{ id: 1 }];
    const result = extractValueByPath(arr, '[5].id');
    expect(result).toBeUndefined();
  });
});
