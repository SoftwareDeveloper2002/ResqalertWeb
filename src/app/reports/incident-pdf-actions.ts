export type IncidentOffice =
  | "Bureau of Fire Protection (BFP)"
  | "Municipal Disaster Risk Reduction and Management Office (MDRRMO)"
  | "Philippine National Police (PNP)"
  | "MDRRMO - Accepted Request"
  | "BFP - Accepted Request"
  | "PNP - Accepted Request";

/**
 * Standalone function for triggering or accepting PDF requests
 */
export function handleIncidentPdfRequest(
  openIncidentPdfDialogReq: (item: any, title: IncidentOffice) => void,
  item: any,
  office: IncidentOffice
): void {
  openIncidentPdfDialogReq(item, office);
}

/**
 * Opens an incident PDF dialog and sends the request to the correct office
 */
export async function openIncidentPdfDialogReq(item: any, office: IncidentOffice): Promise<void> {
  try {
    // Send the request to your API endpoint
    const response = await fetch(`/api/incidents/pdf-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: item.id, office }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send PDF request: ${response.statusText}`);
    }

    console.log(`PDF request sent to ${office} for incident ${item.id}`);
  } catch (error) {
    console.error("Error sending PDF request:", error);
  }
}
