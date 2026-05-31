import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBloomSpace, useJoinBloomSpace } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const joinSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
});

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useCreateBloomSpace();
  const joinMutation = useJoinBloomSpace();

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

  const joinForm = useForm<z.infer<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
    defaultValues: { inviteCode: "" },
  });

  const onCreateSubmit = (values: z.infer<typeof createSchema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => setLocation("/"),
        onError: () => toast({ title: "Failed to create space", variant: "destructive" }),
      }
    );
  };

  const onJoinSubmit = (values: z.infer<typeof joinSchema>) => {
    joinMutation.mutate(
      { data: values },
      {
        onSuccess: () => setLocation("/"),
        onError: () => toast({ title: "Invalid invite code", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <Card className="w-full max-w-md glass-card border-none shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-serif text-3xl text-primary mb-2">Welcome to Bloom Together</CardTitle>
          <CardDescription className="text-lg">
            Let's get your shared space set up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 rounded-2xl">
              <TabsTrigger value="create" className="rounded-xl">Create Space</TabsTrigger>
              <TabsTrigger value="join" className="rounded-xl">Join Space</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create">
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Space Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Our Cozy Corner" {...field} className="bg-white/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full rounded-2xl" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Space"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="join">
              <Form {...joinForm}>
                <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
                  <FormField
                    control={joinForm.control}
                    name="inviteCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter code from your partner" {...field} className="bg-white/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full rounded-2xl" disabled={joinMutation.isPending}>
                    {joinMutation.isPending ? "Joining..." : "Join Space"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
