// ========== MAINTENANCE ==========

export type VehicleMaintenance = {
  id: string;
  vehicle_id: string;
  maintenance_date: string;
  description: string;
  cost_tzs: number;
  duration_hours: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: { reg_number: string; model: string } | null;
};

export const maintenanceQuery = queryOptions({
  queryKey: ["maintenance"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("vehicle_maintenance")
      .select(`
        *,
        vehicle:vehicles(reg_number, model)
      `)
      .order("maintenance_date", { ascending: false });
    if (error) throw error;
    return data as (VehicleMaintenance & { vehicle: { reg_number: string; model: string } | null })[];
  },
});

export const vehicleMaintenanceQuery = (vehicleId: string) =>
  queryOptions({
    queryKey: ["maintenance", "vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select(`
          *,
          vehicle:vehicles(reg_number, model)
        `)
        .eq("vehicle_id", vehicleId)
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      return data as (VehicleMaintenance & { vehicle: { reg_number: string; model: string } | null })[];
    },
  });
