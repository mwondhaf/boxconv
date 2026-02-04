import { TrendingDown, TrendingUp } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  footer?: string
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  footer,
}: StatCardProps) {
  return (
    <Card className="@container/card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
          {trend && (
            <Badge variant={trend.isPositive ? 'default' : 'secondary'}>
              {trend.isPositive ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      {footer && (
        <CardFooter className="text-xs text-muted-foreground">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

export interface StatsCardsProps {
  stats: Array<StatCardProps>
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}
