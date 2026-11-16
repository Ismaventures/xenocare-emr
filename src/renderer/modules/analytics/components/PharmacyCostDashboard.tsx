// =============================================================================
// XENOCARE EMR - Pharmacy Cost Analysis Dashboard
// Comprehensive drug cost, margins, and inventory analytics
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pill,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  BarChart3,
} from 'lucide-react';
import { Card, StatsCard, DataTable } from '../../../components/ui';
import {
  Bar3DChart,
  Pie3DChart,
  formatCurrency,
  chartColors,
} from './AdvancedCharts';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

interface DrugCostMetrics {
  drug_id: string;
  drug_name: string;
  category: string;
  unit_cost: number;
  selling_price: number;
  quantity_sold: number;
  total_cost: number;
  total_revenue: number;
  margin: number;
  margin_percentage: number;
  stock_level: number;
  reorder_level: number;
}

interface PharmacySummary {
  total_drugs: number;
  total_cost: number;
  total_revenue: number;
  total_margin: number;
  avg_margin_percentage: number;
  top_selling_drug: string;
  low_margin_count: number;
  below_reorder_count: number;
}

interface CategoryAnalysis {
  category: string;
  revenue: number;
  cost: number;
  margin: number;
  items_sold: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function getPharmacyCostSummary(filters: {
  startDate: string;
  endDate: string;
}): Promise<PharmacySummary> {
  const { startDate, endDate } = filters;

  // Get inventory data
  const { data: inventory } = await supabase
    .from('pharmacy_inventory')
    .select('*');

  // Get dispensed items
  const { data: dispensed } = await supabase
    .from('pharmacy_dispenses')
    .select(
      `
      id,
      quantity,
      unit_price,
      total_price,
      created_at,
      drug:pharmacy_inventory(drug_name, unit_cost, category)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  let totalCost = 0;
  let totalRevenue = 0;
  const drugSales = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();

  dispensed?.forEach((item) => {
    const drug = item.drug as any;
    const unitCost = drug?.unit_cost || 0;
    const cost = unitCost * (item.quantity || 0);
    const revenue = item.total_price || item.unit_price * item.quantity || 0;

    totalCost += cost;
    totalRevenue += revenue;

    const drugName = drug?.drug_name || 'Unknown';
    const existing = drugSales.get(drugName) || {
      name: drugName,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += item.quantity || 0;
    existing.revenue += revenue;
    drugSales.set(drugName, existing);
  });

  // Find top selling drug
  let topSellingDrug = 'N/A';
  let maxQuantity = 0;
  drugSales.forEach((sales) => {
    if (sales.quantity > maxQuantity) {
      maxQuantity = sales.quantity;
      topSellingDrug = sales.name;
    }
  });

  // Count low margin items
  const lowMarginCount =
    inventory?.filter((inv) => {
      const margin =
        ((inv.selling_price || 0) - (inv.unit_cost || 0)) /
        (inv.selling_price || 1);
      return margin < 0.2;
    }).length || 0;

  // Count below reorder level
  const belowReorderCount =
    inventory?.filter(
      (inv) => (inv.quantity_in_stock || 0) <= (inv.reorder_level || 0),
    ).length || 0;

  const totalMargin = totalRevenue - totalCost;
  const avgMarginPercentage =
    totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

  return {
    total_drugs: inventory?.length || 0,
    total_cost: totalCost,
    total_revenue: totalRevenue,
    total_margin: totalMargin,
    avg_margin_percentage: avgMarginPercentage,
    top_selling_drug: topSellingDrug,
    low_margin_count: lowMarginCount,
    below_reorder_count: belowReorderCount,
  };
}

async function getDrugCostMetrics(filters: {
  startDate: string;
  endDate: string;
}): Promise<DrugCostMetrics[]> {
  const { startDate, endDate } = filters;

  // Get inventory
  const { data: inventory } = await supabase
    .from('pharmacy_inventory')
    .select('*');

  // Get dispensed items aggregated by drug
  const { data: dispensed } = await supabase
    .from('pharmacy_dispenses')
    .select(
      `
      drug_id,
      quantity,
      unit_price,
      total_price,
      drug:pharmacy_inventory(drug_name, unit_cost, category)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  const drugMetrics = new Map<
    string,
    {
      totalQuantity: number;
      totalRevenue: number;
      totalCost: number;
    }
  >();

  dispensed?.forEach((item) => {
    const drug = item.drug as any;
    const drugId = item.drug_id;
    const existing = drugMetrics.get(drugId) || {
      totalQuantity: 0,
      totalRevenue: 0,
      totalCost: 0,
    };

    existing.totalQuantity += item.quantity || 0;
    existing.totalRevenue += item.total_price || 0;
    existing.totalCost += (drug?.unit_cost || 0) * (item.quantity || 0);

    drugMetrics.set(drugId, existing);
  });

  return (inventory || [])
    .map((inv) => {
      const metrics = drugMetrics.get(inv.id);
      const totalCost = metrics?.totalCost || 0;
      const totalRevenue = metrics?.totalRevenue || 0;
      const margin = totalRevenue - totalCost;
      const marginPercentage =
        totalRevenue > 0 ? Math.round((margin / totalRevenue) * 100) : 0;

      return {
        drug_id: inv.id,
        drug_name: inv.drug_name || 'Unknown',
        category: inv.category || 'General',
        unit_cost: inv.unit_cost || 0,
        selling_price: inv.selling_price || 0,
        quantity_sold: metrics?.totalQuantity || 0,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        margin,
        margin_percentage: marginPercentage,
        stock_level: inv.quantity_in_stock || 0,
        reorder_level: inv.reorder_level || 10,
      };
    })
    .filter((drug) => drug.quantity_sold > 0)
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

async function getCategoryAnalysis(filters: {
  startDate: string;
  endDate: string;
}): Promise<CategoryAnalysis[]> {
  const { startDate, endDate } = filters;

  const { data: dispensed } = await supabase
    .from('pharmacy_dispenses')
    .select(
      `
      quantity,
      total_price,
      drug:pharmacy_inventory(category, unit_cost)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  const categoryMap = new Map<
    string,
    {
      revenue: number;
      cost: number;
      items: number;
    }
  >();

  dispensed?.forEach((item) => {
    const drug = item.drug as any;
    const category = drug?.category || 'General';
    const existing = categoryMap.get(category) || {
      revenue: 0,
      cost: 0,
      items: 0,
    };

    existing.revenue += item.total_price || 0;
    existing.cost += (drug?.unit_cost || 0) * (item.quantity || 0);
    existing.items += item.quantity || 0;

    categoryMap.set(category, existing);
  });

  return Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      revenue: stats.revenue,
      cost: stats.cost,
      margin: stats.revenue - stats.cost,
      items_sold: stats.items,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

async function getMonthlyTrends(year: number) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const results = [];

  for (let month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    if (startDate > new Date()) break;

    const { data } = await supabase
      .from('pharmacy_dispenses')
      .select('total_price')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const revenue =
      data?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

    results.push({
      label: months[month],
      value: revenue,
      color: chartColors.primary[1],
    });
  }

  return results;
}

// =============================================================================
// Main Component
// =============================================================================

const PharmacyCostDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['pharmacy-cost-summary', dateRange],
    queryFn: () => getPharmacyCostSummary(dateRange),
  });

  const { data: drugMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['drug-metrics', dateRange],
    queryFn: () => getDrugCostMetrics(dateRange),
  });

  const { data: categoryData } = useQuery({
    queryKey: ['pharmacy-category', dateRange],
    queryFn: () => getCategoryAnalysis(dateRange),
  });

  const { data: trends } = useQuery({
    queryKey: ['pharmacy-trends', new Date().getFullYear()],
    queryFn: () => getMonthlyTrends(new Date().getFullYear()),
  });

  const categories = useMemo(() => {
    if (!drugMetrics) return [];
    const cats = new Set(drugMetrics.map((d) => d.category));
    return Array.from(cats);
  }, [drugMetrics]);

  const filteredDrugs = useMemo(() => {
    if (!drugMetrics) return [];
    let filtered = drugMetrics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (drug) =>
          drug.drug_name.toLowerCase().includes(query) ||
          drug.category.toLowerCase().includes(query),
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((drug) => drug.category === categoryFilter);
    }

    return filtered;
  }, [drugMetrics, searchQuery, categoryFilter]);

  const topDrugsChart = useMemo(() => {
    if (!drugMetrics) return [];
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16',
    ];
    return drugMetrics.slice(0, 8).map((drug, index) => ({
      label:
        drug.drug_name.length > 15
          ? `${drug.drug_name.substring(0, 15)}...`
          : drug.drug_name,
      value: drug.total_revenue,
      color: colors[index % colors.length],
    }));
  }, [drugMetrics]);

  const categoryChartData = useMemo(() => {
    if (!categoryData) return [];
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
    ];
    return categoryData.slice(0, 6).map((cat, index) => ({
      label: cat.category,
      value: cat.revenue,
      color: colors[index % colors.length],
    }));
  }, [categoryData]);

  const marginDistribution = useMemo(() => {
    if (!drugMetrics) return [];
    let high = 0;
    let medium = 0;
    let low = 0;
    drugMetrics.forEach((drug) => {
      if (drug.margin_percentage >= 30) high++;
      else if (drug.margin_percentage >= 15) medium++;
      else low++;
    });
    return [
      { label: 'High (≥30%)', value: high, color: '#22c55e' },
      { label: 'Medium (15-30%)', value: medium, color: '#f59e0b' },
      { label: 'Low (<15%)', value: low, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [drugMetrics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isLoading = summaryLoading || metricsLoading;

  if (isLoading && !summary && !drugMetrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const columns = [
    {
      key: 'drug_name',
      header: 'Drug',
      render: (item: DrugCostMetrics) => (
        <div>
          <div className="font-medium">{item.drug_name}</div>
          <div className="text-xs text-gray-500">{item.category}</div>
        </div>
      ),
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      render: (item: DrugCostMetrics) => formatCurrency(item.unit_cost),
    },
    {
      key: 'selling_price',
      header: 'Selling Price',
      render: (item: DrugCostMetrics) => formatCurrency(item.selling_price),
    },
    {
      key: 'quantity_sold',
      header: 'Qty Sold',
      render: (item: DrugCostMetrics) => (
        <span className="font-medium">{item.quantity_sold}</span>
      ),
    },
    {
      key: 'total_revenue',
      header: 'Revenue',
      render: (item: DrugCostMetrics) => (
        <span className="text-green-600 font-medium">
          {formatCurrency(item.total_revenue)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Margin',
      render: (item: DrugCostMetrics) => (
        <span className={item.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatCurrency(item.margin)}
        </span>
      ),
    },
    {
      key: 'margin_percentage',
      header: 'Margin %',
      render: (item: DrugCostMetrics) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full ${
                item.margin_percentage >= 30
                  ? 'bg-green-500'
                  : item.margin_percentage >= 15
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(item.margin_percentage, 100)}%` }}
            />
          </div>
          <span className="text-sm">{item.margin_percentage}%</span>
        </div>
      ),
    },
    {
      key: 'stock_level',
      header: 'Stock',
      render: (item: DrugCostMetrics) => (
        <span
          className={
            item.stock_level <= item.reorder_level
              ? 'text-red-600 font-medium'
              : ''
          }
        >
          {item.stock_level}
          {item.stock_level <= item.reorder_level && (
            <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-6 h-6 text-green-600" />
            Pharmacy Cost Analysis
          </h1>
          <p className="text-gray-500">
            Drug costs, margins, and profitability analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
            className="w-40"
          />
          <span className="text-gray-500">to</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
            className="w-40"
          />
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(summary?.total_revenue || 0)}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Total Cost"
          value={formatCurrency(summary?.total_cost || 0)}
          icon={Package}
          variant="info"
        />
        <StatsCard
          title="Total Margin"
          value={formatCurrency(summary?.total_margin || 0)}
          icon={TrendingUp}
          variant={
            summary?.total_margin && summary.total_margin >= 0
              ? 'success'
              : 'error'
          }
        />
        <StatsCard
          title="Avg Margin %"
          value={`${summary?.avg_margin_percentage || 0}%`}
          icon={BarChart3}
          variant="info"
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Top Selling Drug">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-green-500" />
            <span className="font-medium">
              {summary?.top_selling_drug || 'N/A'}
            </span>
          </div>
        </Card>
        <Card title="Low Margin Drugs">
          <div className="flex items-center gap-2">
            <TrendingDown
              className={`w-5 h-5 ${(summary?.low_margin_count || 0) > 0 ? 'text-yellow-500' : 'text-green-500'}`}
            />
            <span
              className={`font-medium ${(summary?.low_margin_count || 0) > 0 ? 'text-yellow-600' : ''}`}
            >
              {summary?.low_margin_count || 0} items below 20% margin
            </span>
          </div>
        </Card>
        <Card title="Below Reorder Level">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`w-5 h-5 ${(summary?.below_reorder_count || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}
            />
            <span
              className={`font-medium ${(summary?.below_reorder_count || 0) > 0 ? 'text-red-600' : ''}`}
            >
              {summary?.below_reorder_count || 0} items need reordering
            </span>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Bar3DChart
          data={topDrugsChart}
          title="Top Revenue Drugs"
          subtitle="Top 8 drugs by revenue"
          formatValue={formatCurrency}
        />
        <Pie3DChart
          data={categoryChartData}
          title="Revenue by Category"
          subtitle="Distribution across drug categories"
        />
        <Pie3DChart
          data={marginDistribution}
          title="Margin Distribution"
          subtitle="Drugs by margin percentage"
        />
      </div>

      {/* Monthly Trends */}
      <Bar3DChart
        data={trends || []}
        title="Monthly Pharmacy Revenue"
        subtitle={`Revenue trend for ${new Date().getFullYear()}`}
        formatValue={formatCurrency}
      />

      {/* Drug Table */}
      <Card title="Drug Cost & Margin Analysis">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search drug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-48"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          data={filteredDrugs}
          columns={columns}
          keyField="drug_id"
          emptyMessage="No drug data available for the selected period"
        />
      </Card>
    </div>
  );
};

export default PharmacyCostDashboard;
