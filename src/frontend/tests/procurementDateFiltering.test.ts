import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countProductsAndDistinctOrders,
  filterByCreatedAt,
  isCreatedAtInDateRange,
} from '../src/features/procurements/lib/dateFiltering.ts'

const dayOne = new Date(2026, 9, 21)
const dayTwo = new Date(2026, 9, 22)
const rows = [
  { id: 'a', orderId: 'order-1', createdAt: new Date(2026, 9, 21, 0, 0).toISOString() },
  { id: 'b', orderId: 'order-1', createdAt: new Date(2026, 9, 21, 23, 59, 59, 999).toISOString() },
  { id: 'c', orderId: 'order-2', createdAt: new Date(2026, 9, 22, 12).toISOString() },
  { id: 'd', orderId: 'order-3', createdAt: new Date(2026, 9, 23, 0, 0).toISOString() },
]

test('a single selected date includes the full local calendar day', () => {
  assert.equal(isCreatedAtInDateRange(rows[0]!.createdAt, { from: dayOne }), true)
  assert.equal(isCreatedAtInDateRange(rows[1]!.createdAt, { from: dayOne }), true)
  assert.equal(isCreatedAtInDateRange(rows[2]!.createdAt, { from: dayOne }), false)
})

test('a date range includes both boundary days', () => {
  assert.deepEqual(
    filterByCreatedAt(rows, { from: dayOne, to: dayTwo }).map((row) => row.id),
    ['a', 'b', 'c'],
  )
})

test('clearing a date filter returns every row and independent ranges stay isolated', () => {
  const firstColumn = filterByCreatedAt(rows, { from: dayOne })
  const secondColumn = filterByCreatedAt(rows, { from: dayTwo })

  assert.deepEqual(firstColumn.map((row) => row.id), ['a', 'b'])
  assert.deepEqual(secondColumn.map((row) => row.id), ['c'])
  assert.deepEqual(filterByCreatedAt(rows, undefined), rows)
})

test('counts products and distinct order IDs', () => {
  const visible = filterByCreatedAt(rows, { from: dayOne })
  assert.deepEqual(countProductsAndDistinctOrders(visible), { products: 2, orders: 1 })
})
