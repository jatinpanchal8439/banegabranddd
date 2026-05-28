import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useCrmQuery, useCrmInsert, useCrmUpdate, useCrmDelete } from "@/hooks/useCrm";
import { Plus, Search, Filter, Loader2, Upload, FileSpreadsheet, Trash2, Edit, Eye, Star, StickyNote, Download, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface DbLead {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  source: string | null; status: string; value: number | null; business_status: string | null;
  assigned_to: string | null; created_at: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default", contacted: "outline", qualified: "secondary", lost: "destructive",
};
const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

// Lead scoring based on data completeness and status
function getLeadScore(lead: DbLead): number {
  let score = 0;
  if (lead.name) score += 10;
  if (lead.email) score += 15;
  if (lead.phone) score += 15;
  if (lead.company) score += 10;
  if (lead.source) score += 10;
  if ((lead.value || 0) > 0) score += 15;
  if (lead.status === "qualified") score += 25;
  else if (lead.status === "contacted") score += 15;
  else if (lead.status === "new") score += 5;
  return Math.min(score, 100);
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-destructive";
}

export default function Leads() {
  const { data: leads = [], isLoading } = useCrmQuery<DbLead>("leads");
  const insertLead = useCrmInsert("leads");
  const updateLead = useCrmUpdate<Record<string, unknown>>("leads");
  const deleteLead = useCrmDelete("leads");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<DbLead | null>(null);
  const [editLead, setEditLead] = useState<DbLead | null>(null);
  const [noteText, setNoteText] = useState("");
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "Website", value: "" });

  const filtered = leads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || (l.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAdd = async () => {
    if (!form.name || !form.email) return;
    await insertLead.mutateAsync({
      name: form.name, email: form.email, phone: form.phone, company: form.company,
      source: form.source, value: Number(form.value) || 0, status: "new" as any,
    });
    setForm({ name: "", email: "", phone: "", company: "", source: "Website", value: "" });
    setDialogOpen(false);
    toast.success("Lead added successfully");
  };

  // Excel/CSV upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
        
        // Map common column names
        const mapped = jsonData.map((row: any) => ({
          name: row.Name || row.name || row["Full Name"] || row["Lead Name"] || "",
          email: row.Email || row.email || row["Email Address"] || "",
          phone: row.Phone || row.phone || row["Mobile"] || row["Phone Number"] || "",
          company: row.Company || row.company || row["Company Name"] || row["Organization"] || "",
          source: row.Source || row.source || row["Lead Source"] || "Excel Import",
          value: Number(row.Value || row.value || row["Deal Value"] || 0),
        })).filter((r: any) => r.name);

        setUploadPreview(mapped);
        if (mapped.length === 0) {
          toast.error("No valid leads found. Ensure columns: Name, Email, Phone, Company, Source, Value");
        }
      } catch {
        toast.error("Failed to parse file. Please upload a valid Excel or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImport = async () => {
    if (uploadPreview.length === 0) return;
    setUploading(true);
    let success = 0;
    for (const lead of uploadPreview) {
      try {
        await insertLead.mutateAsync({
          name: lead.name, email: lead.email, phone: lead.phone,
          company: lead.company, source: lead.source, value: lead.value,
          status: "new" as any,
        });
        success++;
      } catch { /* skip duplicates */ }
    }
    setUploading(false);
    setUploadPreview([]);
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`${success} leads imported successfully!`);
  };

  const handleUpdate = async () => {
    if (!editLead) return;
    await updateLead.mutateAsync({
      id: editLead.id,
      name: editLead.name,
      email: editLead.email,
      phone: editLead.phone,
      company: editLead.company,
      source: editLead.source,
      value: editLead.value,
      status: editLead.status as any,
      business_status: editLead.business_status,
    } as any);
    setEditLead(null);
    toast.success("Lead updated");
  };

  const handleDelete = async (id: string) => {
    await deleteLead.mutateAsync(id);
    setDetailLead(null);
    toast.success("Lead deleted");
  };

  // Export leads to Excel
  const handleExport = () => {
    const exportData = leads.map(l => ({
      Name: l.name, Email: l.email, Phone: l.phone, Company: l.company,
      Source: l.source, Status: l.status, Value: l.value, "Business Status": l.business_status,
      "Created At": new Date(l.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_export.xlsx");
    toast.success("Leads exported!");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Leads</h1><p className="text-muted-foreground">Manage your sales leads</p></div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild><Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import Excel</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Import Leads from Excel/CSV</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Upload Excel (.xlsx, .xls) or CSV file</p>
                  <p className="text-xs text-muted-foreground mb-3">Columns: Name, Email, Phone, Company, Source, Value</p>
                  <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                </div>
                {uploadPreview.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{uploadPreview.length} leads found</p>
                      <Button variant="ghost" size="sm" onClick={() => { setUploadPreview([]); if (fileRef.current) fileRef.current.value = ""; }}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="max-h-60 overflow-auto rounded border">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Company</TableHead><TableHead>Source</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {uploadPreview.slice(0, 10).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{r.name}</TableCell>
                              <TableCell className="text-sm">{r.email}</TableCell>
                              <TableCell className="text-sm">{r.phone}</TableCell>
                              <TableCell className="text-sm">{r.company}</TableCell>
                              <TableCell className="text-sm">{r.source}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {uploadPreview.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">...and {uploadPreview.length - 10} more</p>}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleBulkImport} disabled={uploading || uploadPreview.length === 0}>
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${uploadPreview.length} Leads`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                {[{ label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }, { label: "Company", key: "company" }, { label: "Value (₹)", key: "value" }].map(f => (
                  <div key={f.key} className="grid gap-2"><Label>{f.label}</Label><Input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} /></div>
                ))}
                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} disabled={insertLead.isPending} className="mt-2">{insertLead.isPending ? "Adding..." : "Add Lead"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.length}</p><p className="text-xs text-muted-foreground">Total Leads</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.filter(l => l.status === "new").length}</p><p className="text-xs text-muted-foreground">New</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.filter(l => l.status === "qualified").length}</p><p className="text-xs text-muted-foreground">Qualified</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{formatCurrency(leads.reduce((s, l) => s + (l.value || 0), 0))}</p><p className="text-xs text-muted-foreground">Total Value</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No leads found. Add your first lead or import from Excel!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Company</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lead => {
                  const score = getLeadScore(lead);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.email && <a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a>}
                          </p>
                          {lead.phone && <a href={`tel:${lead.phone}`} className="text-xs text-muted-foreground hover:text-primary">📞 {lead.phone}</a>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{lead.company}</TableCell>
                      <TableCell className="hidden sm:table-cell">{lead.source}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Star className={`h-3.5 w-3.5 ${getScoreColor(score)}`} />
                          <span className={`text-sm font-medium ${getScoreColor(score)}`}>{score}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusColors[lead.status] || "outline"}>{lead.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(lead.value || 0)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailLead(lead)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditLead(lead)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(lead.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {detailLead && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{detailLead.name}</h3>
                <div className="flex items-center gap-1.5">
                  <Star className={`h-4 w-4 ${getScoreColor(getLeadScore(detailLead))}`} />
                  <span className={`font-bold ${getScoreColor(getLeadScore(detailLead))}`}>{getLeadScore(detailLead)}/100</span>
                </div>
              </div>
              <Progress value={getLeadScore(detailLead)} className="h-2" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{detailLead.email || "-"}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{detailLead.phone || "-"}</p></div>
                <div><p className="text-muted-foreground">Company</p><p className="font-medium">{detailLead.company || "-"}</p></div>
                <div><p className="text-muted-foreground">Source</p><p className="font-medium">{detailLead.source || "-"}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant={statusColors[detailLead.status]}>{detailLead.status}</Badge></div>
                <div><p className="text-muted-foreground">Value</p><p className="font-medium">{formatCurrency(detailLead.value || 0)}</p></div>
                <div><p className="text-muted-foreground">Business Status</p><Badge variant="outline">{detailLead.business_status || "Active"}</Badge></div>
                <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(detailLead.created_at).toLocaleDateString()}</p></div>
              </div>
              <div className="flex gap-2 pt-2">
                {detailLead.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${detailLead.phone}`}>📞 Call</a></Button>}
                {detailLead.email && <Button size="sm" variant="outline" asChild><a href={`mailto:${detailLead.email}`}>✉️ Email</a></Button>}
                {detailLead.phone && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank">💬 WhatsApp</a></Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && (
            <div className="grid gap-4 py-4">
              {[{ label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }, { label: "Company", key: "company" }].map(f => (
                <div key={f.key} className="grid gap-2"><Label>{f.label}</Label><Input value={(editLead as any)[f.key] || ""} onChange={e => setEditLead({ ...editLead, [f.key]: e.target.value })} /></div>
              ))}
              <div className="grid gap-2"><Label>Value (₹)</Label><Input type="number" value={editLead.value || 0} onChange={e => setEditLead({ ...editLead, value: Number(e.target.value) })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editLead.status} onValueChange={v => setEditLead({ ...editLead, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["new", "contacted", "qualified", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Business Status</Label>
                  <Select value={editLead.business_status || "active"} onValueChange={v => setEditLead({ ...editLead, business_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["active", "no-go", "done"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={editLead.source || "Website"} onValueChange={v => setEditLead({ ...editLead, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdate} disabled={updateLead.isPending}>{updateLead.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
