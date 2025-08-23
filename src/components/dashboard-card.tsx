
"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
    icon: LucideIcon | React.ReactNode;
    title?: string;
    description: string;
    href: string;
    disabled?: boolean;
}

export function DashboardCard({ icon: Icon, title, description, href, disabled = false }: DashboardCardProps) {

  const renderIcon = () => {
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    const IconComponent = Icon as LucideIcon;
    return <IconComponent className="h-6 w-6 text-accent" />;
  }

  const cardContent = (
    <Card 
        className={cn(
            "flex flex-col h-full transition-all", 
            disabled ? "bg-muted/50 text-muted-foreground" : "hover:shadow-lg hover:-translate-y-1"
        )}
    >
      <CardHeader className="flex-grow">
        <div className="flex items-center gap-3 mb-2">
            {renderIcon()}
            {title && <CardTitle className="font-headline text-lg">{title}</CardTitle>}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" disabled={disabled} variant={disabled ? "outline" : "default"}>
          {disabled ? "Coming Soon" : "Launch"}
        </Button>
      </CardFooter>
    </Card>
  );

  if (disabled) {
    return (
        <div className="cursor-not-allowed">
            {cardContent}
        </div>
    );
  }

  return (
    <Link href={href}>
        {cardContent}
    </Link>
  );
}
