/**
 * Copyright Schrodinger, LLC
 */
import IntegerBufferSet from 'IntegerBufferSet';
import PrefixIntervalTree from 'PrefixIntervalTree';
import { assert } from 'chai';
import computeRenderedRows from 'computeRenderedRows';
import sinon from 'sinon';

describe('computeRenderedRows', function() {
  beforeEach(function() {
    computeRenderedRows.__Rewire__('roughHeightsSelector', () => ({
      bufferRowCount: 2,
      maxAvailableHeight: 600,
    }));
    computeRenderedRows.__Rewire__('scrollbarsVisibleSelector', () => ({
      availableHeight: 600,
    }));
    computeRenderedRows.__Rewire__('tableHeightsSelector', () => ({
      bodyHeight: 600,
    }));
  });

  afterEach(function() {
    computeRenderedRows.__ResetDependency__('roughHeightsSelector');
    computeRenderedRows.__ResetDependency__('scrollbarsVisibleSelector');
    computeRenderedRows.__ResetDependency__('tableHeightsSelector');
  });

  describe('computeRenderedRows', function() {
    let sandbox;
    let oldState;
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      const initialStoredHeights = {};
      for (let rowIdx = 0; rowIdx < 80; rowIdx++) {
        initialStoredHeights[rowIdx] = 125;
      }
      oldState = {
        bufferSet: new IntegerBufferSet(),
        placeholder: 'temp',
        rowOffsets: PrefixIntervalTree.uniform(80, 125),
        rowSettings: {
          rowsCount: 80,
          rowHeightGetter: () => 125,
          subRowHeightGetter: () => 0,
        },
        storedHeights: initialStoredHeights,
        scrollContentHeight: 10000,
      };
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should update bufferSet & row heights for buffered rows', function() {
      const scrollAnchor = {
        firstIndex: 15,
        firstOffset: -25,
        lastIndex: undefined,
      };

      const newState = computeRenderedRows(oldState, scrollAnchor);

      const expectedRowHeights = {};
      const expectedRows = [];
      for (let rowIdx = 13; rowIdx < 22; rowIdx++) {
        expectedRows.push(rowIdx);
        expectedRowHeights[rowIdx] = rowIdx * 125;

        assert.strictEqual(newState.storedHeights[rowIdx], 125,
          'expected stored height of 125 for each row');
        assert.strictEqual(newState.rowOffsets.get(rowIdx), 125,
          'expected row offsets for each row to be set to 125');
        assert.isNotNull(newState.bufferSet.getValuePosition(rowIdx),
          `expected a buffer position for each row. rowIdx: ${rowIdx}`);
      }

      assert.isNull(newState.bufferSet.getValuePosition(12),
        'expected no buffer position for other row');

      assert.deepEqual(newState, Object.assign(oldState, {
        firstRowIndex: 15,
        firstRowOffset: -25,
        maxScrollY: 9400,
        rowHeights: expectedRowHeights,
        rows: expectedRows,
        scrollY: 1900,
      }));
    });

    it('should work as expected when lastIndex is specified', function() {
      const scrollAnchor = {
        firstIndex: undefined,
        firstOffset: 0,
        lastIndex: 30,
      };

      const newState = computeRenderedRows(oldState, scrollAnchor);

      const expectedRowHeights = {};
      const expectedRows = [];
      for (let rowIdx = 24; rowIdx < 33; rowIdx++) {
        expectedRows.push(rowIdx);
        expectedRowHeights[rowIdx] = rowIdx * 125;

        assert.strictEqual(newState.storedHeights[rowIdx], 125,
          'expected stored height of 125 for each row');
        assert.strictEqual(newState.rowOffsets.get(rowIdx), 125,
          'expected row offsets for each row to be set to 125');
        assert.isNotNull(newState.bufferSet.getValuePosition(rowIdx),
          `expected a buffer position for each row. rowIdx: ${rowIdx}`);
      }

      assert.isNull(newState.bufferSet.getValuePosition(12),
        'expected no buffer position for other row');

      assert.deepEqual(newState, Object.assign(oldState, {
        firstRowIndex: 26,
        firstRowOffset: -25,
        maxScrollY: 9400,
        rowHeights: expectedRowHeights,
        rows: expectedRows,
        scrollY: 3275,
      }));
    });

    it('should handle things well when rowsCount is 0', function() {
      const scrollAnchor = {
        firstIndex: 15,
        firstOffset: -25,
        lastIndex: undefined,
      };
      oldState.rowSettings.rowsCount = 0;

      const newState = computeRenderedRows(oldState, scrollAnchor);

      assert.deepEqual(newState, Object.assign(oldState, {
        maxScrollY: 9400,
        rowHeights: {},
        rows: [],
        scrollY: 0,
      }));
    });

    it('should clamp scrollY to maxScrollY', function() {
      const scrollAnchor = {
        firstIndex: 90,
        firstOffset: 0,
        lastIndex: undefined,
      };

      const newState = computeRenderedRows(oldState, scrollAnchor);

      const expectedRowHeights = {};
      const expectedRows = [];
      for (let rowIdx = 73; rowIdx < 80; rowIdx++) {
        expectedRows.push(rowIdx);
        expectedRowHeights[rowIdx] = rowIdx * 125;

        assert.strictEqual(newState.storedHeights[rowIdx], 125,
          'expected stored height of 125 for each row');
        assert.strictEqual(newState.rowOffsets.get(rowIdx), 125,
          'expected row offsets for each row to be set to 125');
        assert.isNotNull(newState.bufferSet.getValuePosition(rowIdx),
          `expected a buffer position for each row. rowIdx: ${rowIdx}`);
      }

      assert.isNull(newState.bufferSet.getValuePosition(80),
        'expected no buffer position for other row');

      assert.deepEqual(newState, Object.assign(oldState, {
        firstRowIndex: 75,
        firstRowOffset: -25,
        maxScrollY: 9400,
        rowHeights: expectedRowHeights,
        rows: expectedRows,
        scrollY: 9400,
      }));
    });

    it('should update row heights and scrollContentHeight', function() {
      const scrollAnchor = {
        firstIndex: 15,
        firstOffset: -25,
        lastIndex: undefined,
      };
      oldState.rowSettings.rowHeightGetter = () => 200;

      const rowOffsetsMock = sandbox.mock(PrefixIntervalTree.prototype);
      oldState.rowOffsets = PrefixIntervalTree.uniform(80, 125);
      for (let rowIdx = 13; rowIdx < 21; rowIdx++) {
        rowOffsetsMock.expects('set').once().withArgs(rowIdx, 200);
      }

      const newState = computeRenderedRows(oldState, scrollAnchor);
      sandbox.verify();

      let priorHeight = 1625;
      const expectedRowHeights = {};
      const expectedRows = [];
      for (let rowIdx = 13; rowIdx < 21; rowIdx++) {
        expectedRows.push(rowIdx);
        expectedRowHeights[rowIdx] = priorHeight;
        priorHeight += 200;

        assert.strictEqual(newState.storedHeights[rowIdx], 200,
          'expected stored height of 200 for each row');
      }

      assert.deepEqual(newState, Object.assign(oldState, {
        firstRowIndex: 15,
        firstRowOffset: -25,
        maxScrollY: 10000,
        rowHeights: expectedRowHeights,
        rows: expectedRows,
        scrollContentHeight: 10600,
        scrollY: 2050,
      }));
    });
  });
});