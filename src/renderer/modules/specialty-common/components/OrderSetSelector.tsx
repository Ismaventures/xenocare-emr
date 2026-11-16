/**
 * =============================================================================
 * ORDER SET SELECTOR
 * =============================================================================
 * Panel shown in the Orders step that lets the doctor pick a pre-bundled
 * investigation panel (e.g. "Chest Pain Workup") to auto-populate lab/imaging
 * orders instead of searching one by one.
 *
 * Features:
 * - Lists available order sets for the current specialty
 * - Shows what tests/imaging each set contains
 * - Click to apply — adds all items to the active order lists
 * - Visual feedback for already-applied sets
 * =============================================================================
 */

import React, { useState, useCallback } from 'react';
import {
  Package,
  FlaskConical,
  Scan,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Plus,
  Info,
} from 'lucide-react';
import { Button, SearchableOption } from '../../../components/ui';
import { useOrderSets } from '../hooks/useSpecialtyClinic';
import type {
  SpecialtyOrderSet,
  OrderSetItem,
} from '../dtos/specialty-clinic.dto';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';

interface OrderSetSelectorProps {
  specialtyCode: string;
  /** Current lab orders — to show "already added" status */
  currentLabOrders: LabOrderDTO[];
  /** Current imaging orders */
  currentRadiologyOrders: RadiologyOrderDTO[];
  /** Callback to add lab orders */
  onAddLabOrders: (orders: LabOrderDTO[]) => void;
  /** Callback to add imaging orders */
  onAddRadiologyOrders: (orders: RadiologyOrderDTO[]) => void;
  /** Lab test catalogue for UUID resolution */
  labTestOptions?: SearchableOption[];
  /** Imaging catalogue for UUID resolution */
  imagingOptions?: SearchableOption[];
}

/** Match an order-set item to a catalogue entry by name or code */
function findCatalogueId(
  item: OrderSetItem,
  catalogue: SearchableOption[] | undefined,
): string | null {
  if (!catalogue) return null;
  const nameLower = item.name.toLowerCase();
  const codeLower = item.code?.toLowerCase();
  const match = catalogue.find(
    (c) =>
      c.name.toLowerCase() === nameLower ||
      (codeLower && c.code?.toLowerCase() === codeLower),
  );
  return match?.id ?? null;
}

export default function OrderSetSelector({
  specialtyCode,
  currentLabOrders,
  currentRadiologyOrders,
  onAddLabOrders,
  onAddRadiologyOrders,
  labTestOptions,
  imagingOptions,
}: OrderSetSelectorProps) {
  const { data: orderSets, isLoading } = useOrderSets(specialtyCode);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [appliedSets, setAppliedSets] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((setId: string) => {
    setExpandedSet((prev) => (prev === setId ? null : setId));
  }, []);

  /** Check if a lab order-set item is already in the current orders */
  const isLabAlreadyOrdered = useCallback(
    (item: OrderSetItem) => {
      const nameLower = item.name.toLowerCase();
      return currentLabOrders.some(
        (existing) =>
          (existing.test_name || '').toLowerCase() === nameLower ||
          (existing.test_code || '').toLowerCase() ===
            (item.code || '').toLowerCase(),
      );
    },
    [currentLabOrders],
  );

  /** Check if an imaging order-set item is already in the current orders */
  const isImagingAlreadyOrdered = useCallback(
    (item: OrderSetItem) => {
      const nameLower = item.name.toLowerCase();
      return currentRadiologyOrders.some(
        (existing) =>
          (existing.clinical_indication || '')
            .toLowerCase()
            .includes(nameLower) ||
          existing.imaging_id === findCatalogueId(item, imagingOptions),
      );
    },
    [currentRadiologyOrders, imagingOptions],
  );

  const applyOrderSet = useCallback(
    (orderSet: SpecialtyOrderSet) => {
      // Convert order set items to lab DTOs, resolving catalogue UUIDs
      const newLabOrders: LabOrderDTO[] = (orderSet.orders.lab_tests || [])
        .filter((item) => !isLabAlreadyOrdered(item))
        .map((item) => {
          const catalogueId = findCatalogueId(item, labTestOptions);
          return {
            test_id: catalogueId || item.code || item.name,
            test_name: item.name,
            test_code: item.code,
            clinical_notes: `From order set: ${orderSet.set_name}`,
            priority: 'Normal' as const,
          };
        })
        .filter((o) => o.test_id); // drop items that couldn't resolve

      // Convert order set items to imaging DTOs (deduplicate by imaging_id)
      const seenImagingIds = new Set(
        currentRadiologyOrders.map((o) => o.imaging_id),
      );
      const newImagingOrders: RadiologyOrderDTO[] = (
        orderSet.orders.imaging || []
      )
        .filter((item) => !isImagingAlreadyOrdered(item))
        .map((item) => {
          const catalogueId = findCatalogueId(item, imagingOptions);
          return {
            imaging_id: catalogueId || item.code || item.name,
            body_part: item.body_part,
            clinical_indication: `From order set: ${orderSet.set_name}`,
            priority: 'Normal' as const,
          };
        })
        .filter((o) => {
          if (!o.imaging_id || seenImagingIds.has(o.imaging_id)) return false;
          seenImagingIds.add(o.imaging_id);
          return true;
        });

      if (newLabOrders.length > 0) onAddLabOrders(newLabOrders);
      if (newImagingOrders.length > 0) onAddRadiologyOrders(newImagingOrders);

      setAppliedSets((prev) => new Set([...prev, orderSet.id]));
    },
    [
      currentLabOrders,
      currentRadiologyOrders,
      onAddLabOrders,
      onAddRadiologyOrders,
      labTestOptions,
      imagingOptions,
      isLabAlreadyOrdered,
      isImagingAlreadyOrdered,
    ],
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!orderSets || orderSets.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Package className="w-4 h-4 text-purple-600" />
        <span className="font-semibold">Quick Order Sets</span>
        <span className="text-xs text-gray-500">
          Select a panel to auto-populate orders
        </span>
      </div>

      {/* Order Set Cards */}
      <div className="space-y-1.5">
        {orderSets.map((set) => {
          const isExpanded = expandedSet === set.id;
          const isApplied = appliedSets.has(set.id);
          const labCount = set.orders.lab_tests?.length || 0;
          const imagingCount = set.orders.imaging?.length || 0;

          return (
            <div
              key={set.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isApplied
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
              }`}
            >
              {/* Set Header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                onClick={() => toggleExpand(set.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {set.set_name}
                    </span>
                    {set.is_system && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                        System
                      </span>
                    )}
                    {isApplied && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Applied
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {labCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <FlaskConical className="w-3 h-3" />
                        {labCount} labs
                      </span>
                    )}
                    {imagingCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Scan className="w-3 h-3" />
                        {imagingCount} imaging
                      </span>
                    )}
                  </div>
                </div>

                {!isApplied && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyOrderSet(set);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-200 pt-2 space-y-2">
                  {set.clinical_scenario && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{set.clinical_scenario}</span>
                    </div>
                  )}

                  {/* Lab Tests */}
                  {labCount > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-blue-600 mb-1">
                        <FlaskConical className="w-3 h-3" />
                        Laboratory Tests
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {set.orders.lab_tests!.map((item, idx) => (
                          <OrderItemChip
                            key={idx}
                            item={item}
                            isAdded={isLabAlreadyOrdered(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Imaging */}
                  {imagingCount > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-amber-600 mb-1">
                        <Scan className="w-3 h-3" />
                        Imaging / Diagnostics
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {set.orders.imaging!.map((item, idx) => (
                          <OrderItemChip
                            key={idx}
                            item={item}
                            isAdded={isImagingAlreadyOrdered(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Helper: Order item chip
// =============================================================================

function OrderItemChip({
  item,
  isAdded,
}: {
  item: OrderSetItem;
  isAdded: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
        isAdded
          ? 'bg-green-50 text-green-700 border border-green-300'
          : 'bg-gray-50 text-gray-700 border border-gray-200'
      }`}
    >
      {isAdded && <CheckCircle2 className="w-3 h-3" />}
      {item.name}
    </span>
  );
}
