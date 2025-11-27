"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AmountInput } from "@/components/ui/AmountInput";
import { Banner } from "@/components/ui/Banner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { IconWallet } from "@/components/icons/IconWallet";
import { Tooltip } from "@/components/ui/Tooltip";
import { StatsBar } from "@/components/ui/StatsBar";

export default function KitchenSinkPage() {
  const [activeTab, setActiveTab] = useState("tab1");
  const [inputValue, setInputValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-neutral-100 space-y-12 font-sans text-neutral-900 pb-24">
      {/* New Stats Bar Section */}
      <section className="bg-white pb-8 border-b border-neutral-200">
        <StatsBar
          items={[
            { label: "Total Supply", value: "36,666 YFI" },
            { label: "Staked", value: "2,583 YFI" },
            { label: "Network", value: "Ethereum Mainnet" },
          ]}
        />
        <div className="container mx-auto px-4 pt-8">
          <h1 className="text-4xl font-bold">UI Kitchen Sink</h1>
          <p className="text-neutral-600 text-lg">
            Design system verification for Phase 4.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 space-y-12">
        {/* Tooltips */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Tooltips
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <Tooltip content="Primary action">
              <Button variant="primary">Hover me</Button>
            </Tooltip>
            <Tooltip content="Secondary action" side="bottom">
              <Button variant="secondary">Hover me</Button>
            </Tooltip>
            <Tooltip content="Icon button">
              <Button variant="ghost" size="sm">
                <IconWallet className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Buttons
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="styfi">stYFI Brand</Button>
            <Button variant="veyfi">veYFI Brand</Button>
            <Button disabled>Disabled</Button>
            <Button isLoading>Loading</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="secondary">
              <IconWallet className="mr-2 h-4 w-4" />
              With Icon
            </Button>
          </div>
        </section>

        {/* Cards & Input */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Cards & Inputs
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="space-y-4">
              <h3 className="font-bold">Standard Input</h3>
              <AmountInput
                value={inputValue}
                onChange={setInputValue}
                maxLabel="Balance: 1,000.00"
                onMaxClick={() => setInputValue("1000")}
              />
            </Card>
            <Card className="space-y-4">
              <h3 className="font-bold">Input with Token & Error</h3>
              <AmountInput
                value="5000"
                onChange={() => {}}
                tokenSymbol="YFI"
                error="Insufficient balance"
              />
            </Card>
          </div>
        </section>

        {/* Banners */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Banners
          </h2>
          <div className="space-y-4">
            <Banner variant="info" title="Information">
              This is a standard informational banner useful for context.
            </Banner>
            <Banner variant="warning" title="Wrong Network">
              You are connected to the wrong network. Please switch to Ethereum
              Mainnet.
            </Banner>
            <Banner variant="error" title="Blacklisted">
              Your address has been restricted from using this interface.
            </Banner>
          </div>
        </section>

        {/* Progress & Loading */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Progress & Loading
          </h2>
          <div className="space-y-6 p-6 bg-white rounded-lg border border-neutral-300">
            <div className="space-y-2">
              <p className="text-sm font-medium">Cooldown Progress</p>
              <ProgressBar value={33} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Success State</p>
              <ProgressBar value={100} variant="success" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Skeletons</p>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Tabs
          </h2>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "tab1", label: "Stake" },
              { id: "tab2", label: "Unstake" },
              { id: "tab3", label: "Claim Rewards" },
            ]}
          />
          <div className="p-4 bg-white rounded-lg border border-neutral-200 text-sm">
            Active content: <span className="font-bold">{activeTab}</span>
          </div>
        </section>

        {/* Tables */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Data Table
          </h2>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Staked</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">sdYFI</TableCell>
                  <TableCell className="font-number">1,203.44</TableCell>
                  <TableCell className="font-number">0.00</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary">
                      Deposit
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">upYFI</TableCell>
                  <TableCell className="font-number">50.00</TableCell>
                  <TableCell className="font-number">100.00</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary">
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* Modal */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Modals
          </h2>
          <Button onClick={() => setIsModalOpen(true)} variant="primary">
            Open Demo Modal
          </Button>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Confirm Action"
          >
            <div className="space-y-4">
              <p className="text-neutral-600">
                Are you sure you want to proceed with this action? This will
                lock your tokens for 4 weeks.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="styfi"
                  onClick={() => {
                    toast.success("Action confirmed");
                    setIsModalOpen(false);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </Modal>
        </section>

        {/* Toasts */}
        <section className="space-y-4 pb-24">
          <h2 className="text-xl font-bold border-b border-neutral-300 pb-2">
            Toasts
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => toast.success("Operation successful!")}
              variant="secondary"
            >
              Trigger Success
            </Button>
            <Button
              onClick={() => toast.error("Something went wrong.")}
              variant="secondary"
            >
              Trigger Error
            </Button>
            <Button
              onClick={() => {
                const id = toast.loading("Waiting for confirmation...");
                setTimeout(() => {
                  toast.success("Confirmed!", { id });
                }, 2000);
              }}
              variant="secondary"
            >
              Trigger Promise Flow
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
