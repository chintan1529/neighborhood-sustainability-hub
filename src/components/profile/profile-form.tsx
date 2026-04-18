"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

interface ProfileFormProps {
  user: any;
  profile: any;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: profile.full_name || "",
      phone: profile.phone || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      const result = await updateProfile({
        fullName: values.fullName,
        phone: values.phone,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your profile details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-xl">
              {getInitials(profile.full_name || "User")}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm">
            Change Avatar
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName && (
              <p className="text-xs text-red-500">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={user.email} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="+91..."
              {...form.register("phone")}
            />
          </div>

          <Button className="w-full" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
