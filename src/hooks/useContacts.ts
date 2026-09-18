import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  company: string;
  city: string;
  status: string;
  score: number;
  tags: string[];
  is_blacklisted: boolean;
  whatsapp_valid: boolean | null;
  created_at: string;
  updated_at: string;
  list_ids?: string[];
}

export interface ContactList {
  id: string;
  name: string;
  source: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

export function useContacts(listId?: string | null) {
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ['contacts', listId],
    queryFn: async () => {
      let contactIds: string[] | null = null;

      // If filtering by list, get contact IDs from junction table
      if (listId) {
        const { data: members, error: mErr } = await supabase
          .from('contact_list_members')
          .select('contact_id')
          .eq('list_id', listId);
        if (mErr) throw mErr;
        contactIds = (members || []).map((m: any) => m.contact_id);
        if (contactIds.length === 0) return [];
      }

      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactIds) {
        query = query.in('id', contactIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contacts = (data || []) as any[];

      // Fetch list memberships for all contacts
      const ids = contacts.map(c => c.id);
      let membershipMap: Record<string, string[]> = {};
      if (ids.length > 0) {
        // Batch in chunks to avoid URL length issues
        const CHUNK = 200;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          const { data: members } = await supabase
            .from('contact_list_members')
            .select('contact_id, list_id')
            .in('contact_id', chunk);
          (members || []).forEach((m: any) => {
            if (!membershipMap[m.contact_id]) membershipMap[m.contact_id] = [];
            membershipMap[m.contact_id].push(m.list_id);
          });
        }
      }

      return contacts.map(c => ({
        ...c,
        company: c.company || '',
        city: c.city || '',
        tags: c.tags || [],
        list_ids: membershipMap[c.id] || [],
      })) as Contact[];
    },
  });

  const listsQuery = useQuery({
    queryKey: ['contact-lists'],
    queryFn: async () => {
      const { data: lists, error } = await supabase
        .from('contact_lists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get counts per list from junction table
      const { data: members } = await supabase
        .from('contact_list_members')
        .select('list_id');

      const counts: Record<string, number> = {};
      (members || []).forEach((m: any) => {
        if (m.list_id) counts[m.list_id] = (counts[m.list_id] || 0) + 1;
      });

      return (lists || []).map((l: any) => ({
        ...l,
        contact_count: counts[l.id] || 0,
      })) as ContactList[];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("contacts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_lists" }, () => {
        queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_list_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const addContact = useMutation({
    mutationFn: async (contact: { name: string; phone: string; company?: string; city?: string; tags?: string[]; status?: string; score?: number; list_ids?: string[] }) => {
      const { list_ids, ...rest } = contact;
      const { data, error } = await supabase.from('contacts').insert({
        name: rest.name,
        phone: rest.phone,
        company: rest.company || '',
        city: rest.city || '',
        tags: rest.tags || [],
        status: rest.status || 'novo',
        score: rest.score || 0,
      }).select().single();
      if (error) throw error;

      // Insert junction records
      if (list_ids && list_ids.length > 0) {
        const { error: jErr } = await supabase.from('contact_list_members').insert(
          list_ids.map(lid => ({ contact_id: data.id, list_id: lid }))
        );
        if (jErr) throw jErr;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contato adicionado');
    },
    onError: (err: Error) => {
      if (err.message.includes('idx_contacts_phone')) {
        toast.error('Esse telefone já está cadastrado');
      } else {
        toast.error(`Erro: ${err.message}`);
      }
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, list_ids, ...updates }: Partial<Contact> & { id: string; list_ids?: string[] }) => {
      const { error } = await supabase.from('contacts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      // Update list memberships if provided
      if (list_ids !== undefined) {
        // Delete existing
        await supabase.from('contact_list_members').delete().eq('contact_id', id);
        // Insert new
        if (list_ids.length > 0) {
          const { error: jErr } = await supabase.from('contact_list_members').insert(
            list_ids.map(lid => ({ contact_id: id, list_id: lid }))
          );
          if (jErr) throw jErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contato atualizado');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contato removido');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const addList = useMutation({
    mutationFn: async (list: { name: string; source: string }) => {
      const { data, error } = await supabase.from('contact_lists').insert(list).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Lista criada');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const importContacts = useMutation({
    mutationFn: async (contacts: Array<{ name: string; phone: string; company?: string; city?: string; tags?: string[]; list_ids?: string[]; status?: string; custom_fields?: Record<string, string> }>) => {
      const BATCH = 500;
      let total = 0;
      for (let i = 0; i < contacts.length; i += BATCH) {
        const batch = contacts.slice(i, i + BATCH);
        const rows = batch.map(c => ({
          name: c.name || "Sem nome",
          phone: c.phone,
          company: c.company || "",
          city: c.city || "",
          status: c.status || "novo",
          score: 0,
          tags: c.tags || [],
          custom_fields: c.custom_fields || {},
        }));

        const { data, error } = await supabase.from('contacts').upsert(rows, { onConflict: 'phone' }).select();
        if (error) throw error;
        total += data?.length || 0;

        // Insert junction records for contacts with list_ids
        const junctionRows: { contact_id: string; list_id: string }[] = [];
        (data || []).forEach((contact: any, idx: number) => {
          const original = batch[idx];
          if (original.list_ids && original.list_ids.length > 0) {
            original.list_ids.forEach(lid => {
              junctionRows.push({ contact_id: contact.id, list_id: lid });
            });
          }
        });
        if (junctionRows.length > 0) {
          await supabase.from('contact_list_members').upsert(junctionRows, { onConflict: 'contact_id,list_id' });
        }
      }
      return total;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success(`${count} contatos importados`);
    },
    onError: (err: Error) => toast.error(`Erro na importação: ${err.message}`),
  });

  return {
    contacts: contactsQuery.data ?? [],
    lists: listsQuery.data ?? [],
    isLoading: contactsQuery.isLoading,
    listsLoading: listsQuery.isLoading,
    addContact,
    updateContact,
    deleteContact,
    addList,
    importContacts,
    refetch: contactsQuery.refetch,
  };
}
