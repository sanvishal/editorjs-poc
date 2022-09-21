import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Center,
  Spinner,
  Box,
  HStack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { useQuery } from "react-query";
import { getTranscripts } from "./api";
import { useEditorProxyStore } from "./Editor";
import { delay, findNearestTranscriptByTimeStamp, formatSecondsTimestamp } from "./utils";

export interface IAddQuoteBlockModal {
  isAddQuoteBlockModalOpen: boolean;
  onAddQuoteBlockModalClose: () => void;
  onAddQuoteBlockModalOpen: () => void;
  quoteBlockState: { isOpen: boolean; id: string };
}

export const AddQuoteBlockModal = ({
  isAddQuoteBlockModalOpen,
  onAddQuoteBlockModalClose,
  onAddQuoteBlockModalOpen,
  quoteBlockState,
}: IAddQuoteBlockModal) => {
  const [editorRef, videoRef] = [useEditorProxyStore((state) => state.editorRef), useEditorProxyStore((state) => state.videoRef)];
  const [highlightTs, setHighlightTs] = useState(0);
  const [siblingTs, setSiblingTs] = useState<{ timestamp: number; text: string }[]>([]);
  const [selectedTr, setSelectedTr] = useState<{ timestamp: number; text: string }[]>([]);
  const scrollContRef = useRef<any>();

  const { data: transcripts, isLoading: isTranscriptsLoading } = useQuery(
    ["transcripts", videoRef?.target?.playerInfo?.videoData?.video_id],
    () => getTranscripts(""),
    {
      refetchOnWindowFocus: false,
      onSuccess: () => {},
    }
  );

  const scrollTranscriptIntoView = async (ts: number): Promise<void> => {
    if (transcripts) {
      const nearestTs = findNearestTranscriptByTimeStamp(ts, transcripts);
      if (nearestTs) {
        setSiblingTs(nearestTs.nearestTranscripts);
        await delay(500);
        console.log(String(nearestTs.currentTranscript?.timestamp));
        const ele = document.getElementById(String(nearestTs.currentTranscript?.timestamp));
        if (ele) {
          ele.scrollIntoView({ behavior: "smooth", block: "center" });
          ele.style.background = "var(--chakra-colors-blackAlpha-300)";
          ele.style.fontWeight = "bold";
          if (ele.nextSibling) {
            (ele.nextSibling as HTMLElement).style.background = "var(--chakra-colors-blackAlpha-50)";
          }
          if (ele.previousSibling) {
            (ele.previousSibling as HTMLElement).style.background = "var(--chakra-colors-blackAlpha-50)";
          }
        }
      }
    }
  };

  useEffect(() => {
    if (isAddQuoteBlockModalOpen) {
      const ts = videoRef?.target?.getCurrentTime() || 0;
      setHighlightTs(ts);
      scrollTranscriptIntoView(ts);
    } else {
      setHighlightTs(0);
      setSelectedTr([]);
    }
  }, [isAddQuoteBlockModalOpen]);

  const handleClose = () => {
    if (editorRef && quoteBlockState.id && quoteBlockState.isOpen) {
      const blockIdx = editorRef.blocks.getBlockIndex(quoteBlockState.id);
      if (blockIdx) {
        editorRef.blocks.delete(blockIdx);
      }
    }
    onAddQuoteBlockModalClose();
  };

  const handleQuote = () => {
    if (editorRef && quoteBlockState.id && quoteBlockState.isOpen && videoRef) {
      const timestamp = videoRef?.target?.getCurrentTime() || 0;
      const fullText = selectedTr.map((tr) => tr.text).join(", ");
      editorRef.blocks.update(quoteBlockState.id, { text: fullText, timestamp });
    }
    onAddQuoteBlockModalClose();
  };

  const handleJumpToTs = (ts: number) => {
    if (videoRef && ts) {
      // videoRef?.target?.seekTo(ts / 1000);
    }
  };

  const handleOnSelect = (tr: { timestamp: number; text: string }) => {
    if (siblingTs.length > 0) {
      const alreadySelected = selectedTr.find((t) => t.timestamp === tr.timestamp);
      const canSelect = siblingTs.find((t) => t.timestamp === tr.timestamp);
      if (!alreadySelected && canSelect) {
        setSelectedTr([...selectedTr, tr]);
      } else if (alreadySelected && canSelect) {
        setSelectedTr(selectedTr.filter((t) => t.timestamp !== tr.timestamp));
      }
    }
  };

  return (
    <Modal isOpen={isAddQuoteBlockModalOpen} onClose={onAddQuoteBlockModalClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Quote Transcripts</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflow="auto">
          <Box maxH="500px" ref={scrollContRef}>
            {isTranscriptsLoading && (
              <Center mt={10}>
                <Spinner />
              </Center>
            )}
            {!isTranscriptsLoading &&
              transcripts &&
              transcripts?.length &&
              transcripts.map((tr, idx) => {
                return (
                  <HStack
                    key={idx}
                    p={2}
                    alignItems="flex-start"
                    id={String(tr.timestamp)}
                    mb={1}
                    borderRadius={4}
                    onClick={() => handleOnSelect(tr)}
                    border="1px solid"
                    borderColor={
                      selectedTr.find((t) => t.timestamp === tr.timestamp) ? "var(--chakra-colors-blackAlpha-600)" : "transparent"
                    }
                  >
                    <Text color="blue.400" fontWeight="bold" onClick={() => handleJumpToTs(tr.timestamp)} cursor="pointer">
                      {formatSecondsTimestamp(tr.timestamp / 1000)}
                    </Text>
                    <Text fontWeight="inherit">{tr.text}</Text>
                  </HStack>
                );
              })}
          </Box>
        </ModalBody>

        <ModalFooter mt={10} mb={2}>
          <Button variant="solid" mr={3} onClick={handleClose} rounded="full" w="100px" fontWeight="normal">
            Close
          </Button>
          <Button
            variant="solid"
            colorScheme="messenger"
            rounded="full"
            w="140px"
            leftIcon={<FiCheck strokeWidth={3} />}
            onClick={handleQuote}
          >
            Add
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
