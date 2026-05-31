import { useGetMe, useGetMyBloomSpace, useUpdateProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Copy, LogOut, Settings as SettingsIcon, User as UserIcon, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "@workspace/api-client-react";

const profileSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
  favoriteFlower: z.string().optional(),
  favoriteActivity: z.string().optional(),
});

export default function Settings() {
  const { data: me } = useGetMe();
  const { data: space } = useGetMyBloomSpace();
  const updateProfileMutation = useUpdateProfile();
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [partnerNickname, setPartnerNickname] = useState("");
  const [myNicknameFromPartner, setMyNicknameFromPartner] = useState("");
  const [isLoadingNicknames, setIsLoadingNicknames] = useState(true);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  
  const partnerName = space?.members?.find(m => m.id !== me?.id)?.name || "Partner";

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: me?.name || "",
      bio: me?.bio || "",
      favoriteFlower: me?.favoriteFlower || "",
      favoriteActivity: me?.favoriteActivity || "",
    },
  });
  
  // Load nicknames
  useEffect(() => {
    const loadNicknames = async () => {
      try {
        const response = await fetch('/api/bloomspaces/my-nickname', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMyNicknameFromPartner(data.myNicknameFromPartner || "");
          setPartnerNickname(data.nicknameIGavePartner || "");
        }
      } catch (error) {
        console.error('Failed to load nicknames:', error);
      } finally {
        setIsLoadingNicknames(false);
      }
    };
    
    if (me && space) {
      loadNicknames();
    }
  }, [me, space]);
  
  const saveNickname = async () => {
    setIsSavingNickname(true);
    try {
      const response = await fetch('/api/bloomspaces/nickname', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nickname: partnerNickname })
      });
      
      if (response.ok) {
        toast({ title: "Nickname saved! 💕" });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: "Failed to save nickname", variant: "destructive" });
    } finally {
      setIsSavingNickname(false);
    }
  };

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Profile updated" });
        },
        onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
      }
    );
  };

  const copyInvite = () => {
    if (space?.inviteCode) {
      navigator.clipboard.writeText(space.inviteCode);
      toast({ title: "Invite code copied!" });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in duration-500">
      <h1 className="text-3xl font-serif text-primary flex items-center gap-2">
        <SettingsIcon className="w-8 h-8" /> Settings
      </h1>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="favoriteFlower"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favorite Flower</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-white/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="favoriteActivity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favorite Activity</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-white/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="rounded-2xl" disabled={updateProfileMutation.isPending}>
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Bloom Space</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-1">Space Name</h3>
            <p className="text-muted-foreground">{space?.name}</p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Invite Partner</h3>
            <div className="flex gap-2">
              <Input value={space?.inviteCode || ""} readOnly className="bg-white/50 font-mono" />
              <Button onClick={copyInvite} variant="secondary" className="shrink-0">
                <Copy size={16} className="mr-2" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Share this code with your partner so they can join this space.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-pink-200/60">
        <CardHeader>
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary fill-primary" /> Nicknames
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {myNicknameFromPartner && (
            <div className="bg-pink-50/50 rounded-2xl p-4 border border-pink-100">
              <p className="text-sm text-muted-foreground mb-1">Your partner calls you:</p>
              <p className="text-lg font-handwriting text-primary">{myNicknameFromPartner}</p>
            </div>
          )}
          
          <div>
            <h3 className="font-medium mb-2">Nickname for {partnerName}</h3>
            <p className="text-xs text-muted-foreground mb-3">Give your partner a sweet nickname that only you two will see</p>
            <div className="flex gap-2">
              <Input 
                value={partnerNickname}
                onChange={(e) => setPartnerNickname(e.target.value)}
                placeholder={`e.g., My Love, Sunshine...`}
                className="bg-white/50 font-handwriting text-lg"
                disabled={isLoadingNicknames}
              />
              <Button 
                onClick={saveNickname} 
                disabled={isSavingNickname || isLoadingNicknames}
                className="shrink-0 rounded-2xl"
              >
                {isSavingNickname ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 border-t border-border">
        <Button variant="destructive" onClick={logout} className="rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-none shadow-none">
          <LogOut size={16} className="mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
