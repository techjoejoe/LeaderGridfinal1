
"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
    icon: React.ReactNode;
    description: string;
    href: string;
    disabled?: boolean;
}

export function DashboardCard({ icon: Icon, description, href, disabled = false }: DashboardCardProps) {

  const cardContent = (
    <Card 
        className={cn(
            "flex flex-col h-full transition-all text-center", 
            disabled ? "bg-muted/50 text-muted-foreground" : "hover:shadow-lg hover:-translate-y-1"
        )}
    >
      <CardHeader className="items-center flex-grow justify-center">
        <div className={cn("flex items-center justify-center h-32 mb-4")}>
            {Icon}
        </div>
        <CardDescription className="px-2">{description}</CardDescription>
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
        <div className="cursor-not-allowed h-full flex">
            {cardContent}
        </div>
    );
  }

  return (
    <Link href={href} className="flex h-full">
        {cardContent}
    </Link>
  );
}
