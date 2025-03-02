import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, Download, Calendar, Filter, RefreshCw, DollarSign, Users, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const Reports = () => {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    end: new Date()
  });
  const [interval, setInterval] = useState('daily');

  // Get metrics for the dashboard/reports
  const { 
    data: metrics, 
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorData,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => DashboardService.getDashboardMetrics(),
  });

  // Additional queries for detailed reports would be added here
  // For example, getting all visits or payments within the date range
  const { 
    data: visits, 
    isLoading: visitsLoading,
    isError: visitsError,
    error: visitsErrorData
  } = useQuery({
    queryKey: ['allVisits', dateRange],
    queryFn: () => DashboardService.getAllVisits({ 
      limit: 1000, // High limit to get comprehensive data
      // Additional parameters for date filtering would be added here
    }),
    enabled: reportType === 'visits' || reportType === 'overview'
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date for labels
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Generate CSV data for export
  const generateCsvData = (data, type) => {
    if (!data || !Array.isArray(data)) return '';
    
    let headers = [];
    let rows = [];
    
    if (type === 'visits') {
      headers = ['Date', 'Client Name', 'Check In', 'Check Out', 'Duration'];
      rows = data.map(item => [
        new Date(item.check_in).toLocaleDateString(),
        item.client_name || `Client #${item.client_id}`,
        new Date(item.check_in).toLocaleTimeString(),
        item.check_out ? new Date(item.check_out).toLocaleTimeString() : 'Active',
        item.duration ? `${item.duration.toFixed(2)} hours` : 'N/A'
      ]);
    } else if (type === 'revenue') {
      headers = ['Day', 'Revenue'];
      rows = data.map(item => [
        item.day,
        formatCurrency(item.amount)
      ]);
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  };

  // Download report as CSV
  const downloadCsv = (data, type, filename) => {
    const csvData = generateCsvData(data, type);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Creating a sample of data for visualization when actual data is not available
  const demoData = {
    revenue_by_day: [
      {day: "2025-02-23", amount: 980.50},
      {day: "2025-02-24", amount: 875.25},
      {day: "2025-02-25", amount: 1120.00},
      {day: "2025-02-26", amount: 940.75},
      {day: "2025-02-27", amount: 1340.50},
      {day: "2025-02-28", amount: 1680.25},
      {day: "2025-03-01", amount: 1250.75}
    ],
    visits_by_day: [
      {day: "2025-02-23", visit_count: 42},
      {day: "2025-02-24", visit_count: 38},
      {day: "2025-02-25", visit_count: 45},
      {day: "2025-02-26", visit_count: 39},
      {day: "2025-02-27", visit_count: 52},
      {day: "2025-02-28", visit_count: 68},
      {day: "2025-03-01", visit_count: 57}
    ]
  };

  const displayData = metricsLoading ? demoData : metrics || demoData;
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <Button 
          variant="outline" 
          onClick={() => refetchMetrics()}
          disabled={metricsLoading}
          className="flex items-center"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-semibold text-gray-900">
                {displayData.active_clients || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Visits (This Month)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {displayData.visits_by_day?.reduce((sum, day) => sum + day.visit_count, 0) || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue (This Month)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(displayData.revenue_by_day?.reduce((sum, day) => sum + day.amount, 0) || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="visits">Visit Analytics</SelectItem>
              <SelectItem value="revenue">Revenue Analytics</SelectItem>
              <SelectItem value="subscriptions">Subscription Analytics</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Date Range:</span>
            <DatePicker
              selected={dateRange.start}
              onChange={(date) => setDateRange({...dateRange, start: date})}
              className="w-[120px]"
              placeholderText="Start Date"
            />
            <span>-</span>
            <DatePicker
              selected={dateRange.end}
              onChange={(date) => setDateRange({...dateRange, end: date})}
              className="w-[120px]"
              placeholderText="End Date"
            />
          </div>
        </div>
      </div>

      {metricsError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Error loading report data: {metricsErrorData?.message || "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {/* Overview Reports */}
          {reportType === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Daily Visits</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadCsv(displayData.visits_by_day, 'visits', 'visits-report.csv')}
                        className="flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayData.visits_by_day}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} visits`, 'Visits']} labelFormatter={formatDate} />
                          <Legend />
                          <Bar dataKey="visit_count" fill="#3b82f6" name="Visits" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Daily Revenue</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadCsv(displayData.revenue_by_day, 'revenue', 'revenue-report.csv')}
                        className="flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={displayData.revenue_by_day}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} labelFormatter={formatDate} />
                          <Legend />
                          <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} name="Revenue" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Summary</CardTitle>
                  <CardDescription>
                    Overview of subscription status and trends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-700">Active Subscriptions</p>
                      <p className="text-2xl font-semibold text-green-900">
                        {displayData.subscription_stats?.active || 0}
                      </p>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-yellow-700">Expiring Soon</p>
                      <p className="text-2xl font-semibold text-yellow-900">
                        {displayData.subscription_stats?.expiring_soon || 0}
                      </p>
                    </div>
                    
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-700">Expired</p>
                      <p className="text-2xl font-semibold text-red-900">
                        {displayData.subscription_stats?.expired || 0}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Popular Plans</h3>
                    <div className="space-y-2">
                      {displayData.top_plans?.map((plan, index) => (
                        <div key={plan.id} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                              {index + 1}
                            </div>
                            <span>{plan.name}</span>
                          </div>
                          <span className="font-medium">{plan.subscriptions} subscriptions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Visit-specific Analytics */}
          {reportType === 'visits' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Visit Trend Analysis</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadCsv(visits, 'visits', 'detailed-visits-report.csv')}
                    className="flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Detailed Report
                  </Button>
                </CardTitle>
                <CardDescription>
                  Analysis of client visits over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayData.visits_by_day}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} visits`, 'Visits']} labelFormatter={formatDate} />
                      <Legend />
                      <Bar dataKey="visit_count" fill="#3b82f6" name="Visits" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Daily Visits:</span>
                    <span className="font-medium">
                      {(displayData.visits_by_day?.reduce((sum, day) => sum + day.visit_count, 0) / displayData.visits_by_day?.length || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peak Day:</span>
                    <span className="font-medium">
                      {displayData.visits_by_day?.length > 0 ? 
                        formatDate(displayData.visits_by_day.sort((a, b) => b.visit_count - a.visit_count)[0].day) : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Visits:</span>
                    <span className="font-medium">
                      {displayData.visits_by_day?.reduce((sum, day) => sum + day.visit_count, 0) || 0}
                    </span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          )}
          
          {/* Revenue-specific Analytics */}
          {reportType === 'revenue' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Revenue Analysis</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadCsv(displayData.revenue_by_day, 'revenue', 'detailed-revenue-report.csv')}
                    className="flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Detailed Report
                  </Button>
                </CardTitle>
                <CardDescription>
                  Analysis of revenue over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayData.revenue_by_day}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} labelFormatter={formatDate} />
                      <Legend />
                      <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Revenue:</span>
                    <span className="font-medium">
                      {formatCurrency(displayData.revenue_by_day?.reduce((sum, day) => sum + day.amount, 0) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Daily Revenue:</span>
                    <span className="font-medium">
                      {formatCurrency((displayData.revenue_by_day?.reduce((sum, day) => sum + day.amount, 0) / displayData.revenue_by_day?.length || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Highest Revenue Day:</span>
                    <span className="font-medium">
                      {displayData.revenue_by_day?.length > 0 ? 
                        `${formatDate(displayData.revenue_by_day.sort((a, b) => b.amount - a.amount)[0].day)} (${formatCurrency(displayData.revenue_by_day.sort((a, b) => b.amount - a.amount)[0].amount)})` : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          )}
          
          {/* Subscription-specific Analytics */}
          {reportType === 'subscriptions' && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Analysis</CardTitle>
                <CardDescription>
                  Analysis of subscription trends and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Subscription Status</h3>
                    <div className="space-y-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-700">Active Subscriptions</p>
                        <p className="text-2xl font-semibold text-green-900">
                          {displayData.subscription_stats?.active || 0}
                        </p>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-yellow-700">Expiring in Next 7 Days</p>
                        <p className="text-2xl font-semibold text-yellow-900">
                          {displayData.subscription_stats?.expiring_soon || 0}
                        </p>
                      </div>
                      
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-700">Expired Subscriptions</p>
                        <p className="text-2xl font-semibold text-red-900">
                          {displayData.subscription_stats?.expired || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Top Subscription Plans</h3>
                    <div className="space-y-4">
                      {displayData.top_plans?.map((plan, index) => (
                        <div key={plan.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                {index + 1}
                              </div>
                              <span className="font-medium">{plan.name}</span>
                            </div>
                            <Badge>{plan.subscriptions} active</Badge>
                          </div>
                          <Button
                            variant="link"
                            asChild
                            className="p-0 h-auto mt-2"
                          >
                            <Link to={`/plans/${plan.id}`}>
                              View Plan Details
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button asChild variant="outline">
                  <Link to="/plans" className="flex items-center">
                    <BarChartIcon className="mr-2 h-4 w-4" />
                    Manage Subscription Plans
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;