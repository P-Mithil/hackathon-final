"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { TrendingUp, BarChart3 } from "lucide-react" // BarChart3 for volatility idea
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const chartData = [
  { month: "Jan", wheat: 200, corn: 150, soybeans: 300 },
  { month: "Feb", wheat: 210, corn: 160, soybeans: 310 },
  { month: "Mar", wheat: 220, corn: 155, soybeans: 325 },
  { month: "Apr", wheat: 215, corn: 170, soybeans: 315 },
  { month: "May", wheat: 230, corn: 180, soybeans: 340 },
  { month: "Jun", wheat: 225, corn: 175, soybeans: 330 },
]

const chartConfig = {
  wheat: {
    label: "Wheat",
    color: "hsl(var(--chart-1))",
  },
  corn: {
    label: "Corn",
    color: "hsl(var(--chart-2))",
  },
  soybeans: {
    label: "Soybeans",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

interface MarketTrendsWidgetProps {
  className?: string;
}

export default function MarketTrendsWidget({ className }: MarketTrendsWidgetProps) {
  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          <CardTitle className="text-xl font-semibold">Market Trends</CardTitle>
        </div>
        <CardDescription>Nearby market price trends and volatility for key crops.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-video h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <RechartsTooltip
                content={<ChartTooltipContent indicator="line" labelClassName="text-sm" className="bg-card shadow-lg rounded-lg" />}
                cursor={{ stroke: "hsl(var(--accent))", strokeWidth: 2, strokeDasharray: "3 3" }}
              />
              <RechartsLegend content={({ payload }) => (
                  <div className="flex justify-center space-x-4 mt-2">
                    {payload?.map((entry, index) => (
                      <div key={`item-${index}`} className="flex items-center space-x-1 text-xs">
                        <span style={{ backgroundColor: entry.color }} className="h-2 w-2 rounded-full inline-block" />
                        <span>{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )} />
              <Line type="monotone" dataKey="wheat" stroke="var(--color-wheat)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-wheat)" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="corn" stroke="var(--color-corn)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-corn)" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="soybeans" stroke="var(--color-soybeans)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-soybeans)" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-6 space-y-3">
          <h4 className="text-md font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-accent" />
            Market Volatility
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-chart-1 text-chart-1">Wheat: Low</Badge>
            <Badge variant="outline" className="border-chart-2 text-chart-2">Corn: Medium</Badge>
            <Badge variant="outline" className="border-chart-3 text-chart-3">Soybeans: High</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Volatility indicators are based on recent price fluctuations. High volatility may represent higher risk and reward.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
