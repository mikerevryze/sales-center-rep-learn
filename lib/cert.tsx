import { Document, Page, Text, View, StyleSheet, renderToStream, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#0f1220',
    padding: 60,
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#f5f5f7',
    fontFamily: 'Helvetica',
  },
  border: {
    border: '4 solid #7c83ff',
    padding: 50,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 14,
    letterSpacing: 4,
    textAlign: 'center',
    color: '#7c83ff',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#b9bfcf',
    marginBottom: 40,
  },
  name: {
    fontSize: 34,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: 700,
    borderBottom: '1 solid #7c83ff',
    paddingBottom: 16,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: 'center',
    color: '#d0d4e0',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    fontSize: 10,
    color: '#b9bfcf',
  },
  col: { flexDirection: 'column' },
  mono: { fontFamily: 'Courier' },
});

interface CertProps {
  name: string;
  issuedAt: Date;
  certificateId: string;
}

function CertificateDoc({ name, issuedAt, certificateId }: CertProps) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View>
            <Text style={styles.brand}>Revryze</Text>
            <Text style={styles.title}>Certified Sales Rep</Text>
            <Text style={styles.subtitle}>
              This certifies that the below has completed the Revryze generic sales training
              curriculum.
            </Text>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.body}>
              Passed all nine training modules, ran the DRIVE framework against the canonical
              customer archetypes, and met or exceeded the pass bar for generic certification.
            </Text>
          </View>
          <View style={styles.footer}>
            <View style={styles.col}>
              <Text>Issued</Text>
              <Text style={styles.mono}>
                {issuedAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.col}>
              <Text>Certificate ID</Text>
              <Text style={styles.mono}>{certificateId.slice(0, 14)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Prevent network font fetches in server env.
Font.registerHyphenationCallback((word) => [word]);

export async function buildCertificatePDF(props: CertProps): Promise<ReadableStream> {
  const nodeStream = await renderToStream(<CertificateDoc {...props} />);
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err: Error) => controller.error(err));
    },
  });
}
